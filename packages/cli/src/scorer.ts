import {
  Issue,
  Category,
  CategoryScore,
  ScanResult,
  ScoreLevel,
  Severity,
} from "@vibeguard/shared";
import { CATEGORY_WEIGHTS, RULES } from "@vibeguard/shared";

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
  info: 0,
};

function getPassedChecks(category: Category, issues: Issue[]): string[] {
  const failedRuleIds = new Set(
    issues.filter((i) => i.category === category).map((i) => i.ruleId)
  );
  return RULES.filter(
    (r) => r.category === category && !failedRuleIds.has(r.id)
  ).map((r) => r.name.replace(/-/g, " "));
}

function scoreCategory(
  category: Category,
  issues: Issue[]
): CategoryScore {
  const maxScore = CATEGORY_WEIGHTS[category];
  const categoryIssues = issues.filter((i) => i.category === category);

  let deduction = 0;
  for (const issue of categoryIssues) {
    deduction += SEVERITY_DEDUCTIONS[issue.severity];
  }

  const score = Math.max(0, maxScore - deduction);

  return {
    category,
    score,
    maxScore,
    issues: categoryIssues,
    passed: getPassedChecks(category, issues),
  };
}

function getLevel(score: number): ScoreLevel {
  if (score >= 80) return "production-ready";
  if (score >= 60) return "needs-review";
  if (score >= 40) return "risky";
  return "not-ready";
}

export function calculateScore(
  issues: Issue[],
  filesScanned: number,
  duration: number
): ScanResult {
  const categories: CategoryScore[] = [
    scoreCategory("security", issues),
    scoreCategory("quality", issues),
    scoreCategory("production", issues),
  ];

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);

  return {
    totalScore,
    level: getLevel(totalScore),
    categories,
    issues,
    filesScanned,
    scanDuration: duration,
  };
}
