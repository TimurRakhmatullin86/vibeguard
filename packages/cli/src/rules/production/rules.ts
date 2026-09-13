import * as fs from "fs";
import * as path from "path";
import type { ProjectChecker } from "../../scanner";
import type { Issue } from "@vibeguard/shared";

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function findInFiles(
  projectPath: string,
  files: string[],
  pattern: RegExp
): { file: string; line: number } | null {
  for (const f of files) {
    const content = readFileSafe(f);
    if (!content) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return { file: path.relative(projectPath, f), line: i + 1 };
      }
    }
  }
  return null;
}

const noEnvManagement: ProjectChecker = {
  id: "PRD001",
  check(projectPath, allFiles): Issue[] {
    const hasEnvFile = fs.existsSync(path.join(projectPath, ".env")) ||
      fs.existsSync(path.join(projectPath, ".env.example")) ||
      fs.existsSync(path.join(projectPath, ".env.local"));

    const hasDotenv = allFiles.some((f) => {
      const content = readFileSafe(f);
      return content ? /require\s*\(\s*["']dotenv["']\)|from\s+["']dotenv["']|load_dotenv/i.test(content) : false;
    });

    if (!hasEnvFile && !hasDotenv) {
      return [{
        ruleId: "PRD001",
        severity: "medium",
        category: "production",
        message: "No .env file or environment variable management detected",
        file: "project",
        line: 0,
        fix: {
          description: "Add a .env.example file with required variables",
          autoFixable: true,
        },
      }];
    }
    return [];
  },
};

const noHealthCheck: ProjectChecker = {
  id: "PRD002",
  check(projectPath, allFiles): Issue[] {
    const serverFiles = allFiles.filter((f) =>
      /server|app|main|index/.test(path.basename(f)) &&
      /\.(ts|js|mjs)$/.test(f)
    );

    const hasServer = serverFiles.some((f) => {
      const content = readFileSafe(f);
      return content ? /express|fastify|koa|hapi|http\.createServer|createServer/i.test(content) : false;
    });

    if (!hasServer) return [];

    const hasHealthCheck = findInFiles(
      projectPath,
      allFiles,
      /['"]\/(health|healthz|ready|readiness|liveness|status|ping)['"]/
    );

    if (!hasHealthCheck) {
      return [{
        ruleId: "PRD002",
        severity: "medium",
        category: "production",
        message: "No health check endpoint in server application",
        file: "project",
        line: 0,
        fix: {
          description: "Add a /health endpoint that returns 200 OK",
          autoFixable: true,
        },
      }];
    }
    return [];
  },
};

const noGracefulShutdown: ProjectChecker = {
  id: "PRD003",
  check(projectPath, allFiles): Issue[] {
    const hasSignalHandler = findInFiles(
      projectPath,
      allFiles,
      /process\.on\s*\(\s*["'](SIGTERM|SIGINT|beforeExit)["']/
    );

    const hasServer = allFiles.some((f) => {
      const content = readFileSafe(f);
      return content ? /\.listen\s*\(/.test(content) : false;
    });

    if (hasServer && !hasSignalHandler) {
      return [{
        ruleId: "PRD003",
        severity: "medium",
        category: "production",
        message: "No graceful shutdown handler (SIGTERM/SIGINT)",
        file: "project",
        line: 0,
        fix: {
          description: "Add process.on('SIGTERM') handler to close connections gracefully",
          autoFixable: false,
        },
      }];
    }
    return [];
  },
};

const noErrorLogging: ProjectChecker = {
  id: "PRD004",
  check(projectPath, allFiles): Issue[] {
    const loggerLibs = /winston|pino|bunyan|log4js|morgan|signale|tslog|logging|structlog/i;

    const hasPkg = readFileSafe(path.join(projectPath, "package.json"));
    if (hasPkg && loggerLibs.test(hasPkg)) return [];

    const hasLoggerImport = allFiles.some((f) => {
      const content = readFileSafe(f);
      return content ? loggerLibs.test(content) : false;
    });

    if (!hasLoggerImport) {
      return [{
        ruleId: "PRD004",
        severity: "medium",
        category: "production",
        message: "No structured logging library — only console.log detected",
        file: "project",
        line: 0,
        fix: {
          description: "Add a structured logger like pino or winston",
          autoFixable: false,
        },
      }];
    }
    return [];
  },
};

export const productionRules: ProjectChecker[] = [
  noEnvManagement,
  noHealthCheck,
  noGracefulShutdown,
  noErrorLogging,
];
