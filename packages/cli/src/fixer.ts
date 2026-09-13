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

    let content = fs.readFileSync(absPath, "utf-8");
    let modified = false;

    const unusedImports = fileIssues.filter((i) => i.ruleId === "QUA001");
    if (unusedImports.length > 0) {
      const linesToRemove = new Set(unusedImports.map((i) => i.line));
      const lines = content.split("\n");
      const filtered = lines.filter((_, idx) => !linesToRemove.has(idx + 1));
      content = filtered.join("\n");
      modified = true;
      for (const issue of unusedImports) {
        results.push({
          file: relFile,
          ruleId: "QUA001",
          description: `Removed unused import at line ${issue.line}`,
          applied: true,
        });
      }
    }

    const secretIssues = fileIssues.filter((i) => i.ruleId === "SEC001");
    for (const issue of secretIssues) {
      const lines = content.split("\n");
      const lineIdx = issue.line - 1;
      if (lineIdx < lines.length) {
        const line = lines[lineIdx];
        const replaced = line.replace(
          /(["'`])([a-zA-Z0-9_\-]{20,})\1/,
          `process.env.${issue.message.split(" ")[1]?.toUpperCase().replace(/[^A-Z0-9]/g, "_") || "SECRET"}`
        );
        if (replaced !== line) {
          lines[lineIdx] = replaced;
          content = lines.join("\n");
          modified = true;
          results.push({
            file: relFile,
            ruleId: "SEC001",
            description: `Replaced hardcoded secret with env variable at line ${issue.line}`,
            applied: true,
          });
        }
      }
    }

    const httpIssues = fileIssues.filter((i) => i.ruleId === "SEC006");
    for (const issue of httpIssues) {
      const lines = content.split("\n");
      const lineIdx = issue.line - 1;
      if (lineIdx < lines.length) {
        const replaced = lines[lineIdx].replace(
          /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g,
          "https://"
        );
        if (replaced !== lines[lineIdx]) {
          lines[lineIdx] = replaced;
          content = lines.join("\n");
          modified = true;
          results.push({
            file: relFile,
            ruleId: "SEC006",
            description: `Replaced http:// with https:// at line ${issue.line}`,
            applied: true,
          });
        }
      }
    }

    if (modified) {
      fs.writeFileSync(absPath, content, "utf-8");
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
