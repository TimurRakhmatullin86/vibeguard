import { glob } from "glob";
import * as fs from "fs";
import * as path from "path";
import { Issue, ScanOptions } from "@vibeguard/shared";
import { securityRules } from "./rules/security";
import { qualityRules } from "./rules/quality";
import { productionRules } from "./rules/production";

export interface RuleChecker {
  id: string;
  check(filePath: string, content: string, allFiles: string[]): Issue[];
}

export interface ProjectChecker {
  id: string;
  check(projectPath: string, allFiles: string[]): Issue[];
}

const FILE_RULES: RuleChecker[] = [...securityRules, ...qualityRules];
const PROJECT_RULES: ProjectChecker[] = [...productionRules];

const DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.min.js",
  "**/*.bundle.js",
  "**/vendor/**",
  "**/__pycache__/**",
  "**/.git/**",
];

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
];

export async function scanProject(options: ScanOptions): Promise<{
  issues: Issue[];
  filesScanned: number;
  duration: number;
}> {
  const start = Date.now();
  const targetPath = path.resolve(options.path);

  const stat = fs.statSync(targetPath);
  let files: string[];

  if (stat.isFile()) {
    files = [targetPath];
  } else {
    const patterns = SUPPORTED_EXTENSIONS.map(
      (ext) => `${targetPath}/**/*${ext}`
    );
    const excludePatterns = [
      ...DEFAULT_EXCLUDE,
      ...(options.exclude || []),
    ];

    files = await glob(patterns, {
      ignore: excludePatterns,
      absolute: true,
      nodir: true,
    });
  }

  const allIssues: Issue[] = [];
  const enabledRules = options.rules;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relPath = path.relative(targetPath, filePath);

    for (const rule of FILE_RULES) {
      if (enabledRules && !enabledRules.includes(rule.id)) continue;
      const issues = rule.check(relPath, content, files);
      allIssues.push(...issues);
    }
  }

  for (const rule of PROJECT_RULES) {
    if (enabledRules && !enabledRules.includes(rule.id)) continue;
    const issues = rule.check(targetPath, files);
    allIssues.push(...issues);
  }

  return {
    issues: allIssues,
    filesScanned: files.length,
    duration: Date.now() - start,
  };
}
