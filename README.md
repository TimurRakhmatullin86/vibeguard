# VibeGuard

**AI-generated code quality scanner** — catch what SonarQube misses.

45% of AI-generated code fails OWASP Top-10 security tests. Only 8.25% is simultaneously correct AND secure. VibeGuard scans your codebase for AI-specific anti-patterns across three dimensions: **security**, **code quality**, and **production readiness**.

## Quick Start

```bash
npx vibeguard check ./your-project
```

```
╔═══════════════════════════════════════╗
║  VibeGuard Score: 62/100 — Needs Review  ║
╚═══════════════════════════════════════╝

Security (28/40):
  ✗ CRITICAL: Hardcoded API key in src/api.ts:14
  ✗ HIGH: SQL injection in src/db.ts:42
  ✓ Input validation present

Code Quality (22/30):
  ✗ 14 unused imports across 6 files
  ✗ 3 empty catch blocks
  ✓ No dead functions detected

Production (12/30):
  ✗ No health check endpoint
  ✗ Console.log used instead of logger (23 instances)
  ✓ Environment variables used for config
```

## Installation

```bash
# Global
npm install -g vibeguard

# Project dev dependency
npm install -D vibeguard

# Or use directly with npx
npx vibeguard check ./src
```

## Commands

### `vibeguard check <path>`

Scan a project or file for AI code quality issues.

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | Output format: `text` or `json` | `text` |
| `-m, --min-score <n>` | Minimum score — exit code 1 if below | `0` |
| `-e, --exclude <patterns...>` | Glob patterns to exclude | — |

```bash
# Scan with minimum score threshold (for CI)
vibeguard check ./src --min-score 70

# JSON output for programmatic use
vibeguard check ./src --format json

# Exclude test files
vibeguard check ./src --exclude "**/*.test.ts" "**/__mocks__/**"
```

### `vibeguard fix <path>`

Auto-fix safe issues.

```bash
# Preview what would be fixed
vibeguard fix ./src --dry-run

# Apply all safe auto-fixes
vibeguard fix ./src --auto
```

Auto-fix handles:
- Removing unused imports (preserves used imports from the same line)
- Replacing hardcoded secrets with `process.env.X`
- Replacing `http://` with `https://` in API calls
- Creating `.env.example` template

## Scoring System

| Score | Level | Meaning |
|-------|-------|---------|
| 80–100 | 🟢 Production Ready | Safe to deploy |
| 60–79 | 🟡 Needs Review | Works but has issues |
| 40–59 | 🟠 Risky | Serious problems |
| 0–39 | 🔴 Not Ready | Dangerous to deploy |

### Category Weights

| Category | Weight | Focus |
|----------|--------|-------|
| Security | 40 pts | Hardcoded secrets, SQL injection, eval(), CORS |
| Code Quality | 30 pts | Unused imports, empty catch, console.log, TODO/FIXME, magic numbers |
| Production | 30 pts | Health check, graceful shutdown, env management, structured logging |

## Rules (15 total)

### Security (6 rules)
| ID | Rule | Severity |
|----|------|----------|
| SEC001 | Hardcoded API keys and secrets | Critical |
| SEC002 | SQL injection via string interpolation | Critical |
| SEC003 | Missing input validation on routes | High |
| SEC004 | CORS wildcard `*` origin | High |
| SEC005 | eval(), exec(), dangerouslySetInnerHTML | Critical |
| SEC006 | HTTP instead of HTTPS in API calls | Medium |

### Code Quality (5 rules)
| ID | Rule | Severity |
|----|------|----------|
| QUA001 | Unused imports | Low |
| QUA002 | Empty catch blocks | Medium |
| QUA003 | console.log/print in production code | Low |
| QUA004 | TODO/FIXME comments from AI | Low |
| QUA005 | Magic numbers without constants | Low |

### Production Readiness (4 rules)
| ID | Rule | Severity |
|----|------|----------|
| PRD001 | No .env file or env management | Medium |
| PRD002 | No health check endpoint | Medium |
| PRD003 | No graceful shutdown handler | Medium |
| PRD004 | No structured logging library | Medium |

## Web Dashboard

VibeGuard includes a web dashboard for tracking scores across projects over time.

```bash
# Start the dashboard
cd packages/web
npm run dev

# Submit scan results to dashboard
SCAN=$(vibeguard check ./project --format json)
curl -X POST http://localhost:3700/api/scan \
  -H "Content-Type: application/json" \
  -d "{\"projectName\": \"my-app\", \"scanResult\": $SCAN}"
```

**Dashboard features:**
- Project list with scores and trends
- Detailed issue breakdown per project
- Category score visualization (Security / Quality / Production)
- Scan history timeline

## GitHub Actions

```yaml
name: Code Quality
on: [pull_request]

jobs:
  vibeguard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: TimurRakhmatullin86/vibeguard/.github/actions/check@main
        with:
          min-score: 70
          fail-on: critical
```

## Supported Languages

| Language | Support Level |
|----------|--------------|
| TypeScript / JavaScript | Full (all 15 rules) |
| Python | Partial (SEC001, SEC002, SEC005, SEC006, QUA003, QUA004, QUA005, PRD001) |

## Why Not SonarQube?

| | SonarQube | VibeGuard |
|--|-----------|-----------|
| **Price** | $50K+/year | Free & open-source |
| **AI-specific rules** | No | Yes — trained on AI anti-patterns |
| **Setup time** | Hours/days | `npx vibeguard check .` |
| **Scoring** | Complex | Simple 0–100 score |
| **Auto-fix** | No | Safe auto-fixes included |
| **SaaS required** | Yes | No — runs locally |

## License

MIT
