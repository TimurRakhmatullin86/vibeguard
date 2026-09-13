import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { Issue } from "@vibeguard/shared";

interface FixResult {
  file: string;
  ruleId: string;
  description: string;
  applied: boolean;
}

function fixUnusedImportLine(line: string, unusedNames: Set<string>): string | null {
  const namedMatch = line.match(/^(\s*import\s+)\{([^}]+)\}(\s+from\s+.+)$/);
  if (namedMatch) {
    const prefix = namedMatch[1];
    const names = namedMatch[2].split(",").map((n) => n.trim()).filter(Boolean);
    const kept = names.filter((n) => {
      const alias = n.includes(" as ") ? n.split(/\s+as\s+/)[1].trim() : n.trim();
      return !unusedNames.has(alias);
    });
    if (kept.length === 0) return null;
    return `${prefix}{ ${kept.join(", ")} }${namedMatch[3]}`;
  }

  const defaultMatch = line.match(/^\s*import\s+(\w+)\s+from\s+/);
  if (defaultMatch && unusedNames.has(defaultMatch[1])) {
    return null;
  }

  return line;
}

function extractEnvVarName(issue: Issue): string {
  if (issue.fix?.description) {
    const envMatch = issue.fix.description.match(/process\.env\.([A-Z_]+)/);
    if (envMatch) return envMatch[1];
  }
  return "SECRET";
}

export function applyFixes(
  projectPath: string,
  issues: Issue[]
): FixResult[] {
  const fixable = issues.filter((i) => i.fix?.autoFixable);
  const results: FixResult[] = [];

  const byFile = new Map<string, Issue[]>();
  for (const issue of fixable) {
    const key = issue.file;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key)!.push(issue);
  }

  for (const [relFile, fileIssues] of byFile) {
    if (relFile === "project") continue;

    const absPath = path.resolve(projectPath, relFile);
    if (!fs.existsSync(absPath)) {
      for (const issue of fileIssues) {
        results.push({
          file: relFile,
          ruleId: issue.ruleId,
          description: issue.fix!.description,
          applied: false,
        });
      }
      continue;
    }

    const lines = fs.readFileSync(absPath, "utf-8").split("\n");
    let modified = false;

    const unusedImports = fileIssues.filter((i) => i.ruleId === "QUA001");
    if (unusedImports.length > 0) {
      const byLine = new Map<number, Set<string>>();
      for (const issue of unusedImports) {
        const nameMatch = issue.message.match(/Unused import: '(\w+)'/);
        if (!nameMatch) continue;
        if (!byLine.has(issue.line)) byLine.set(issue.line, new Set());
        byLine.get(issue.line)!.add(nameMatch[1]);
      }

      const sortedLines = [...byLine.keys()].sort((a, b) => b - a);
      for (const lineNum of sortedLines) {
        const idx = lineNum - 1;
        if (idx < 0 || idx >= lines.length) continue;
        const unusedNames = byLine.get(lineNum)!;
        const result = fixUnusedImportLine(lines[idx], unusedNames);
        if (result === null) {
          lines.splice(idx, 1);
        } else {
          lines[idx] = result;
        }
        modified = true;
      }

      for (const issue of unusedImports) {
        const nameMatch = issue.message.match(/Unused import: '(\w+)'/);
        results.push({
          file: relFile,
          ruleId: "QUA001",
          description: `Removed unused import '${nameMatch?.[1] || "unknown"}' from line ${issue.line}`,
          applied: true,
        });
      }
    }

    const otherFixes = fileIssues
      .filter((i) => i.ruleId !== "QUA001")
      .sort((a, b) => b.line - a.line);

    for (const issue of otherFixes) {
      if (issue.ruleId === "SEC001") {
        const envName = extractEnvVarName(issue);
        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          if (/process\.env\.|os\.environ/.test(line)) continue;
          const replaced = line.replace(
            /(["'`])([a-zA-Z0-9_-]{8,})\1/,
            `process.env.${envName}`
          );
          if (replaced !== line) {
            const secretPatterns = [
              /(?:api[_-]?key|apikey|secret|token|password|passwd|pwd)\s*[:=]/i,
              /sk-[a-zA-Z0-9]/,
              /ghp_[a-zA-Z0-9]/,
              /AKIA[A-Z0-9]/,
            ];
            if (secretPatterns.some((p) => p.test(line))) {
              lines[idx] = replaced;
              modified = true;
              results.push({
                file: relFile,
                ruleId: "SEC001",
                description: `Replaced hardcoded secret with process.env.${envName} at line ${idx + 1}`,
                applied: true,
              });
              break;
            }
          }
        }
      } else if (issue.ruleId === "SEC006") {
        for (let idx = 0; idx < lines.length; idx++) {
          if (/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(lines[idx])) {
            const replaced = lines[idx].replace(
              /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
              "https://"
            );
            if (replaced !== lines[idx]) {
              lines[idx] = replaced;
              modified = true;
              results.push({
                file: relFile,
                ruleId: "SEC006",
                description: `Replaced http:// with https:// at line ${idx + 1}`,
                applied: true,
              });
              break;
            }
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(absPath, lines.join("\n"), "utf-8");
    }
  }

  const envIssue = issues.find((i) => i.ruleId === "PRD001" && i.fix?.autoFixable);
  if (envIssue) {
    const envExamplePath = path.join(projectPath, ".env.example");
    if (!fs.existsSync(envExamplePath)) {
      fs.writeFileSync(
        envExamplePath,
        "# Required environment variables\n# Copy this file to .env and fill in values\n\n# DATABASE_URL=postgresql://user:pass@localhost:5432/db\n# API_KEY=your-api-key\n# PORT=3000\n",
        "utf-8"
      );
      results.push({
        file: ".env.example",
        ruleId: "PRD001",
        description: "Created .env.example template",
        applied: true,
      });
    }
  }

  return results;
}

export function renderFixResults(results: FixResult[]): string {
  const applied = results.filter((r) => r.applied);
  const skipped = results.filter((r) => !r.applied);

  const lines: string[] = [
    chalk.bold(`\nVibeGuard Auto-Fix Results`),
    chalk.green(`  ✓ ${applied.length} fixes applied`),
  ];

  for (const fix of applied) {
    lines.push(chalk.green(`    ${fix.file}: ${fix.description}`));
  }

  if (skipped.length > 0) {
    lines.push(chalk.yellow(`  ⚠ ${skipped.length} fixes skipped`));
    for (const fix of skipped) {
      lines.push(chalk.yellow(`    ${fix.file}: ${fix.description}`));
    }
  }

  return lines.join("\n");
}
