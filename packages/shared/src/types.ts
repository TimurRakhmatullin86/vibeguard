export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Category = "security" | "quality" | "production";

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  category: Category;
  severity: Severity;
  languages: string[];
}

export interface Issue {
  ruleId: string;
  severity: Severity;
  category: Category;
  message: string;
  file: string;
  line: number;
  column?: number;
  snippet?: string;
  fix?: FixSuggestion;
}

export interface FixSuggestion {
  description: string;
  autoFixable: boolean;
  replacement?: string;
}

export interface CategoryScore {
  category: Category;
  score: number;
  maxScore: number;
  issues: Issue[];
  passed: string[];
}

export interface ScanResult {
  totalScore: number;
  level: ScoreLevel;
  categories: CategoryScore[];
  issues: Issue[];
  filesScanned: number;
  scanDuration: number;
}

export type ScoreLevel = "production-ready" | "needs-review" | "risky" | "not-ready";

export interface ScanOptions {
  path: string;
  minScore?: number;
  fix?: boolean;
  format?: "text" | "json";
  rules?: string[];
  exclude?: string[];
}
