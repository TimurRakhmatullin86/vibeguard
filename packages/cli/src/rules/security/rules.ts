import type { RuleChecker } from "../../scanner";
import type { Issue } from "@vibeguard/shared";

const SECRET_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'`]([a-zA-Z0-9_-]{20,})["'`]/gi, name: "API key" },
  { pattern: /(?:secret|token|password|passwd|pwd)\s*[:=]\s*["'`]([^\s"'`]{8,})["'`]/gi, name: "secret/token" },
  { pattern: /["'`](sk-[a-zA-Z0-9]{20,})["'`]/g, name: "OpenAI API key" },
  { pattern: /["'`](ghp_[a-zA-Z0-9]{36,})["'`]/g, name: "GitHub token" },
  { pattern: /["'`](AKIA[A-Z0-9]{16})["'`]/g, name: "AWS access key" },
  { pattern: /["'`](xox[bpsa]-[a-zA-Z0-9-]{10,})["'`]/g, name: "Slack token" },
  { pattern: /(?:bearer|authorization)\s*[:=]\s*["'`]([^\s"'`]{20,})["'`]/gi, name: "Bearer token" },
];

const ENV_SAFE_PATTERN = /process\.env\.|os\.environ|import\.meta\.env|getenv/;

const hardcodedSecrets: RuleChecker = {
  id: "SEC001",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (ENV_SAFE_PATTERN.test(line)) continue;
      if (/^\s*\/\/|^\s*#|^\s*\*/.test(line)) continue;
      if (/\.test\.|\.spec\.|__test__|_test\.py|mock|fixture/i.test(filePath)) continue;

      for (const { pattern, name } of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          issues.push({
            ruleId: "SEC001",
            severity: "critical",
            category: "security",
            message: `Hardcoded ${name} detected`,
            file: filePath,
            line: i + 1,
            snippet: line.trim().substring(0, 80),
            fix: {
              description: `Replace with environment variable (process.env.${name.toUpperCase().replace(/[\s/-]/g, "_")})`,
              autoFixable: true,
            },
          });
          break;
        }
      }
    }
    return issues;
  },
};

const sqlInjection: RuleChecker = {
  id: "SEC002",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");
    const sqlPatterns = [
      /`\s*SELECT\s+.*\$\{/i,
      /`\s*INSERT\s+.*\$\{/i,
      /`\s*UPDATE\s+.*\$\{/i,
      /`\s*DELETE\s+.*\$\{/i,
      /f["']SELECT\s+.*\{/i,
      /f["']INSERT\s+.*\{/i,
      /f["']UPDATE\s+.*\{/i,
      /f["']DELETE\s+.*\{/i,
      /["']\s*SELECT\s+.*["']\s*\+/i,
      /["']\s*INSERT\s+.*["']\s*\+/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of sqlPatterns) {
        if (pattern.test(line)) {
          issues.push({
            ruleId: "SEC002",
            severity: "critical",
            category: "security",
            message: "SQL injection via string interpolation/concatenation",
            file: filePath,
            line: i + 1,
            snippet: line.trim().substring(0, 80),
            fix: {
              description: "Use parameterized queries instead of string interpolation",
              autoFixable: false,
            },
          });
          break;
        }
      }
    }
    return issues;
  },
};

const missingInputValidation: RuleChecker = {
  id: "SEC003",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");

    const routePattern = /\.(get|post|put|patch|delete)\s*\(\s*["'`][^"'`]+["'`]\s*,/;
    const validationPatterns = [
      /zod|yup|joi|celebrate|express-validator|class-validator|ajv|superstruct/i,
      /\.validate\s*\(/,
      /\.parse\s*\(/,
      /req\.(body|params|query)\s*\.\w+\s*&&/,
      /typeof\s+req\./,
    ];

    for (let i = 0; i < lines.length; i++) {
      if (routePattern.test(lines[i])) {
        const blockEnd = Math.min(i + 20, lines.length);
        const block = lines.slice(i, blockEnd).join("\n");
        const hasValidation = validationPatterns.some((p) => p.test(block));
        if (!hasValidation) {
          issues.push({
            ruleId: "SEC003",
            severity: "high",
            category: "security",
            message: "Route handler without input validation",
            file: filePath,
            line: i + 1,
            snippet: lines[i].trim().substring(0, 80),
            fix: {
              description: "Add input validation using zod, joi, or express-validator",
              autoFixable: false,
            },
          });
        }
      }
    }
    return issues;
  },
};

const corsWildcard: RuleChecker = {
  id: "SEC004",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");
    const corsLinePatterns = [
      /cors\(\s*\)/,
      /cors\(\s*\{/,
      /['"]Access-Control-Allow-Origin['"]/,
    ];
    const reportedLines = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isCorsLine = corsLinePatterns.some((p) => p.test(line));
      if (!isCorsLine) continue;
      if (reportedLines.has(i)) continue;

      const ctx = lines.slice(i, Math.min(i + 5, lines.length)).join(" ");
      const isWildcard =
        /cors\(\s*\)/.test(line) ||
        /origin\s*:\s*["'`]\*["'`]/.test(ctx) ||
        /origin\s*:\s*true/.test(ctx) ||
        /['"]Access-Control-Allow-Origin['"]\s*,\s*["'`]\*["'`]/.test(ctx);

      if (isWildcard) {
        reportedLines.add(i);
        issues.push({
          ruleId: "SEC004",
          severity: "high",
          category: "security",
          message: "CORS wildcard — allows requests from any origin",
          file: filePath,
          line: i + 1,
          snippet: line.trim().substring(0, 80),
          fix: {
            description: "Restrict CORS to specific trusted origins",
            autoFixable: false,
          },
        });
      }
    }
    return issues;
  },
};

const unsafeEval: RuleChecker = {
  id: "SEC005",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");
    const evalPatterns = [
      { pattern: /\beval\s*\(/, name: "eval()" },
      { pattern: /\bexec\s*\(/, name: "exec()" },
      { pattern: /new\s+Function\s*\(/, name: "new Function()" },
      { pattern: /dangerouslySetInnerHTML/, name: "dangerouslySetInnerHTML" },
      { pattern: /\.innerHTML\s*=/, name: "innerHTML assignment" },
    ];

    for (let i = 0; i < lines.length; i++) {
      if (/^\s*\/\/|^\s*#|^\s*\*/.test(lines[i])) continue;

      for (const { pattern, name } of evalPatterns) {
        if (pattern.test(lines[i])) {
          issues.push({
            ruleId: "SEC005",
            severity: "critical",
            category: "security",
            message: `Unsafe ${name} usage — potential code injection`,
            file: filePath,
            line: i + 1,
            snippet: lines[i].trim().substring(0, 80),
            fix: {
              description: `Replace ${name} with a safe alternative`,
              autoFixable: false,
            },
          });
        }
      }
    }
    return issues;
  },
};

const httpNotHttps: RuleChecker = {
  id: "SEC006",
  check(filePath, content): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split("\n");
    const httpPattern = /["'`]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/;

    for (let i = 0; i < lines.length; i++) {
      if (/^\s*\/\/|^\s*#|^\s*\*/.test(lines[i])) continue;
      if (httpPattern.test(lines[i])) {
        issues.push({
          ruleId: "SEC006",
          severity: "medium",
          category: "security",
          message: "HTTP URL used instead of HTTPS",
          file: filePath,
          line: i + 1,
          snippet: lines[i].trim().substring(0, 80),
          fix: {
            description: "Replace http:// with https://",
            autoFixable: true,
          },
        });
      }
    }
    return issues;
  },
};

export const securityRules: RuleChecker[] = [
  hardcodedSecrets,
  sqlInjection,
  missingInputValidation,
  corsWildcard,
  unsafeEval,
  httpNotHttps,
];
