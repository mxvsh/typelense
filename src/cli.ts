#!/usr/bin/env node
import path from "node:path";
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { collectTypeScriptErrors } from "./collectors";
import { detectMonorepo } from "./detectors";
import { generateTSV } from "./generators";

const program = new Command();

program
	.name("typelense")
	.description("TypeScript error collector for monorepos")
	.version("1.0.0")
	.argument(
		"[directory]",
		"Directory to scan for TypeScript errors",
		process.cwd(),
	)
	.option(
		"-o, --output <path>",
		"Output path for the TSV file",
		"typescript-errors.tsv",
	)
	.option("-q, --quiet", "Suppress non-error output", false)
	.action(
		async (directory: string, options: { output: string; quiet: boolean }) => {
			try {
				const targetDir = path.resolve(directory);
				const outputPath = path.resolve(options.output);

				if (!options.quiet) {
					console.log(
						chalk.gray("[DIR]") + " Scanning directory: " + chalk.cyan(targetDir),
					);
					console.log(
						chalk.gray("[OUT]") + " Output file: " + chalk.cyan(outputPath) + "\n",
					);
				}

				// Detect monorepo
				const detectSpinner = ora({
					text: "Detecting monorepo configuration",
					color: "cyan",
				}).start();
				const monorepoInfo = await detectMonorepo(targetDir);

				if (monorepoInfo.isMonorepo) {
					detectSpinner.succeed(
						chalk.green("Detected ") +
							chalk.bold.blue(monorepoInfo.type) +
							chalk.green(
								` monorepo with ${monorepoInfo.packages.length} package(s)`,
							),
					);

					if (!options.quiet && monorepoInfo.packages.length > 0) {
						console.log(chalk.dim("  Packages:"));
						for (const pkg of monorepoInfo.packages) {
							console.log(
								chalk.dim("    *") +
									" " +
									chalk.blue(pkg.name) +
									(pkg.version ? chalk.gray(` (${pkg.version})`) : ""),
							);
						}
						console.log();
					}
				} else {
					detectSpinner.succeed(chalk.green("Single package detected"));
				}

				// Collect TypeScript errors
				const collectSpinner = ora({
					text: "Collecting TypeScript errors",
					color: "cyan",
				}).start();
				const errors = await collectTypeScriptErrors(targetDir, monorepoInfo);

				if (errors.length === 0) {
					collectSpinner.succeed(chalk.green("No TypeScript errors found"));
				} else {
					collectSpinner.warn(
						chalk.yellow(
							`Found ${chalk.bold(errors.length)} TypeScript error(s)`,
						),
					);

					if (!options.quiet) {
						// Group errors by package
						const errorsByPackage = errors.reduce(
							(acc, error) => {
								if (!acc[error.packageName]) {
									acc[error.packageName] = [];
								}
								acc[error.packageName].push(error);
								return acc;
							},
							{} as Record<string, typeof errors>,
						);

						console.log(chalk.dim("\n  Error breakdown:"));
						for (const [pkg, pkgErrors] of Object.entries(errorsByPackage)) {
							const errorCount = pkgErrors.length;
							const countColor = errorCount > 10 ? chalk.red : chalk.yellow;
							console.log(
								chalk.dim("    *") +
									" " +
									chalk.blue(pkg) +
									": " +
									countColor(`${errorCount} error(s)`),
							);
						}
						console.log();
					}
				}

				// Generate TSV file
				const generateSpinner = ora({
					text: "Generating TSV file",
					color: "cyan",
				}).start();
				await generateTSV(errors, outputPath);
				generateSpinner.succeed(
					chalk.green("Results saved to: ") + chalk.cyan(outputPath),
				);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				ora().fail(chalk.red("Error: ") + errorMessage);
				process.exit(1);
			}
		},
	);

program.parse();
