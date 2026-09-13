import type { RuleChecker } from "../../scanner";
import type { Issue } from "@vibeguard/shared";

const unusedImports: RuleChecker = {
  id: "QUA001",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    if (/\.py$/.test(filePath)) return issues;

    const lines = content.split("\n");
    const importNames: { name: string; line: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const namedMatch = line.match(
        /import\s+\{([^}]+)\}\s+from\s+["'`]/
      );
      if (namedMatch) {
        const names = namedMatch[1].split(",").map((n) => {
          const parts = n.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        });
        for (const name of names) {
          if (name) importNames.push({ name, line: i + 1 });
        }
        continue;
      }

      const defaultMatch = line.match(
        /import\s+(\w+)\s+from\s+["'`]/
      );
      if (defaultMatch) {
        importNames.push({ name: defaultMatch[1], line: i + 1 });
      }
    }

    const contentWithoutImports = lines
      .filter((l) => !/^\s*import\s/.test(l))
      .join("\n");

    for (const { name, line } of importNames) {
      if (name === "React") continue;
      const usagePattern = new RegExp(`\\b${name}\\b`);
      if (!usagePattern.test(contentWithoutImports)) {
        issues.push({
          ruleId: "QUA001",
          severity: "low",
          category: "quality",
          message: `Unused import: '${name}'`,
          file: filePath,
          line,
          fix: {
            description: `Remove unused import '${name}'`,
            autoFixable: true,
          },
        });
      }
    }
    return issues;
  },
};

const emptyCatch: RuleChecker = {
  id: "QUA002",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(lines[i])) {
        issues.push({
          ruleId: "QUA002",
          severity: "medium",
          category: "quality",
          message: "Empty catch block silently swallows errors",
          file: filePath,
          line: i + 1,
          snippet: lines[i].trim(),
          fix: {
            description: "Add error logging or re-throw the error",
            autoFixable: false,
          },
        });
        continue;
      }

      if (/catch\s*\([^)]*\)\s*\{/.test(lines[i])) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine === "}" || nextLine === "") {
          const lineAfter = nextLine === "" ? lines[i + 2]?.trim() : nextLine;
          if (lineAfter === "}") {
            issues.push({
              ruleId: "QUA002",
              severity: "medium",
              category: "quality",
              message: "Empty catch block silently swallows errors",
              file: filePath,
              line: i + 1,
              snippet: lines[i].trim(),
              fix: {
                description: "Add error logging or re-throw the error",
                autoFixable: false,
              },
            });
          }
        }
      }
    }
    return issues;
  },
};

const consoleInProduction: RuleChecker = {
  id: "QUA003",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    if (/\.test\.|\.spec\.|__test__|_test\.py/i.test(filePath)) return issues;

    const lines = content.split("\n");
    const jsConsole = /\bconsole\.(log|debug|info|warn|error|trace)\s*\(/;
    const pyPrint = /\bprint\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      if (/^\s*\/\/|^\s*#|^\s*\*/.test(lines[i])) continue;
      const isPython = filePath.endsWith(".py");
      const pattern = isPython ? pyPrint : jsConsole;

      if (pattern.test(lines[i])) {
        issues.push({
          ruleId: "QUA003",
          severity: "low",
          category: "quality",
          message: isPython
            ? "print() statement in production code"
            : "console.log in production code",
          file: filePath,
          line: i + 1,
          snippet: lines[i].trim().substring(0, 80),
          fix: {
            description: "Replace with a structured logger",
            autoFixable: true,
          },
        });
      }
    }
    return issues;
  },
};

const todoFixme: RuleChecker = {
  id: "QUA004",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");
    const pattern = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pattern);
      if (match) {
        issues.push({
          ruleId: "QUA004",
          severity: "low",
          category: "quality",
          message: `${match[1].toUpperCase()} comment: ${(match[2] || "").trim().substring(0, 60) || "(no description)"}`,
          file: filePath,
          line: i + 1,
          snippet: lines[i].trim().substring(0, 80),
        });
      }
    }
    return issues;
  },
};

const magicNumbers: RuleChecker = {
  id: "QUA005",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");
    const ALLOWED = new Set([0, 1, -1, 2, 100, 1000]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*\/\/|^\s*#|^\s*\*|^\s*import|^\s*const\s+\w+\s*=/.test(line)) continue;
      if (/\.length|\.size|\.count|index|port|status/i.test(line)) continue;

      const matches = line.matchAll(/(?<!\w)(\d{2,})\b(?!\s*[;:}\])]?\s*$)/g);
      for (const m of matches) {
        const num = parseInt(m[1], 10);
        if (ALLOWED.has(num)) continue;
        if (num >= 200 && num <= 599) continue; // HTTP status codes
        if (/["'`]/.test(line)) continue; // inside strings

        issues.push({
          ruleId: "QUA005",
          severity: "low",
          category: "quality",
          message: `Magic number ${num} — consider extracting to a named constant`,
          file: filePath,
          line: i + 1,
          snippet: line.trim().substring(0, 80),
        });
        break;
      }
    }
    return issues;
  },
};

export const qualityRules: RuleChecker[] = [
  unusedImports,
  emptyCatch,
  consoleInProduction,
  todoFixme,
  magicNumbers,
];
