import chalk from "chalk";
import { ScanResult, CategoryScore, ScoreLevel } from "@vibeguard/shared";

const LEVEL_LABELS: Record<ScoreLevel, string> = {
  "production-ready": "Production Ready",
  "needs-review": "Needs Review",
  risky: "Risky",
  "not-ready": "Not Ready",
};

const LEVEL_COLORS: Record<ScoreLevel, (s: string) => string> = {
  "production-ready": chalk.green,
  "needs-review": chalk.yellow,
  risky: chalk.hex("#FF8C00"),
  "not-ready": chalk.red,
};

function renderBox(text: string, color: (s: string) => string): string {
  const len = text.length + 4;
  const top = color("╔" + "═".repeat(len) + "╗");
  const mid = color("║") + "  " + chalk.bold(text) + "  " + color("║");
  const bot = color("╚" + "═".repeat(len) + "╝");
  return `${top}\n${mid}\n${bot}`;
}

function renderCategory(cat: CategoryScore): string {
  const lines: string[] = [];
  const catName =
    cat.category.charAt(0).toUpperCase() + cat.category.slice(1);
  lines.push(
    chalk.bold(`\n${catName} (${cat.score}/${cat.maxScore}):`)
  );

  for (const issue of cat.issues) {
    const sevColor =
      issue.severity === "critical"
        ? chalk.red
        : issue.severity === "high"
          ? chalk.hex("#FF8C00")
          : issue.severity === "medium"
            ? chalk.yellow
            : chalk.gray;

    const sev = sevColor(issue.severity.toUpperCase());
    const loc =
      issue.line > 0 ? ` in ${issue.file}:${issue.line}` : "";
    lines.push(`  ✗ ${sev}: ${issue.message}${loc}`);
  }

  for (const passed of cat.passed) {
    lines.push(`  ${chalk.green("✓")} ${passed}`);
  }

  return lines.join("\n");
}

export function renderText(result: ScanResult): string {
  const color = LEVEL_COLORS[result.level];
  const label = LEVEL_LABELS[result.level];
  const header = renderBox(
    `VibeGuard Score: ${result.totalScore}/100 — ${label}`,
    color
  );

  const cats = result.categories.map(renderCategory).join("\n");

  const criticalCount = result.issues.filter(
    (i) => i.severity === "critical"
  ).length;
  const autoFixCount = result.issues.filter(
    (i) => i.fix?.autoFixable
  ).length;

  const footer: string[] = [];
  if (criticalCount > 0) {
    footer.push(
      chalk.bold(
        `\nFix ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} to improve your score`
      )
    );
  }
  if (autoFixCount > 0) {
    footer.push(
      `Run ${chalk.cyan("vibeguard fix --auto")} to auto-fix ${autoFixCount} issue${autoFixCount > 1 ? "s" : ""}`
    );
  }

  const meta = chalk.gray(
    `\nScanned ${result.filesScanned} files in ${result.scanDuration}ms`
  );

  return [header, cats, ...footer, meta].join("\n");
}

export function renderJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
