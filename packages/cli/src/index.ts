#!/usr/bin/env node

import { Command } from "commander";
import { scanProject } from "./scanner";
import { calculateScore } from "./scorer";
import { renderText, renderJson } from "./reporter";
import { applyFixes, renderFixResults } from "./fixer";

const program = new Command();

program
  .name("vibeguard")
  .description(
    "AI-generated code quality scanner — security, quality, and production readiness"
  )
  .version("0.1.0");

program
  .command("check")
  .description("Scan a project or file for AI code quality issues")
  .argument("<path>", "Path to project directory or file")
  .option("-f, --format <format>", "Output format: text or json", "text")
  .option(
    "-m, --min-score <score>",
    "Minimum score threshold (exit code 1 if below)",
    "0"
  )
  .option("-e, --exclude <patterns...>", "Glob patterns to exclude")
  .action(async (targetPath: string, opts) => {
    try {
      const { issues, filesScanned, duration } = await scanProject({
        path: targetPath,
        exclude: opts.exclude,
      });

      const result = calculateScore(issues, filesScanned, duration);

      if (opts.format === "json") {
        console.log(renderJson(result));
      } else {
        console.log(renderText(result));
      }

      const minScore = parseInt(opts.minScore, 10);
      if (minScore > 0 && result.totalScore < minScore) {
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    }
  });

program
  .command("fix")
  .description("Auto-fix safe issues in a project")
  .argument("<path>", "Path to project directory")
  .option("--auto", "Apply all safe auto-fixes", false)
  .option("--dry-run", "Show what would be fixed without applying", false)
  .action(async (targetPath: string, opts) => {
    try {
      const { issues } = await scanProject({ path: targetPath });
      const fixable = issues.filter((i) => i.fix?.autoFixable);

      if (fixable.length === 0) {
        console.log("No auto-fixable issues found.");
        return;
      }

      if (opts.dryRun) {
        console.log(`Found ${fixable.length} auto-fixable issues:`);
        for (const issue of fixable) {
          console.log(
            `  ${issue.file}:${issue.line} — ${issue.fix!.description}`
          );
        }
        return;
      }

      if (!opts.auto) {
        console.log(
          `Found ${fixable.length} auto-fixable issues. Use --auto to apply.`
        );
        return;
      }

      const results = applyFixes(targetPath, issues);
      console.log(renderFixResults(results));
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    }
  });

program.parse();
