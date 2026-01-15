#!/usr/bin/env node
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import ora, { type Ora } from "ora";
import { collectTypeScriptErrors } from "./collectors";
import { detectMonorepo } from "./detectors";
import { generateTSV } from "./generators";

const program = new Command();

// Handle Ctrl+C gracefully
let interrupted = false;
let activeSpinner: Ora | null = null;

process.on("SIGINT", () => {
	if (!interrupted) {
		interrupted = true;
		if (activeSpinner) {
			activeSpinner.stop();
		}
		console.log(chalk.yellow("\n\n⚠ Interrupted by user"));
		process.exit(130);
	}
});

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
						`${chalk.gray("[DIR]")} Scanning directory: ${chalk.cyan(targetDir)}`,
					);
					console.log(
						`${chalk.gray("[OUT]")} Output file: ${chalk.cyan(outputPath)}\n`,
					);
				}

				// Detect monorepo
				const detectSpinner = ora({
					text: "Detecting monorepo configuration",
					color: "cyan",
				}).start();
				activeSpinner = detectSpinner;
				const monorepoInfo = await detectMonorepo(targetDir);
				activeSpinner = null;

				if (monorepoInfo.isMonorepo) {
					detectSpinner.succeed(
						chalk.green("Detected ") +
							chalk.bold.blue(monorepoInfo.type) +
							chalk.green(
								` monorepo with ${chalk.bold(monorepoInfo.packages.length)} package(s)`,
							),
					);
				} else {
					detectSpinner.succeed(chalk.green("Single package detected"));
				}

				// Collect TypeScript errors with progress
				const collectSpinner = ora({
					text: "Collecting TypeScript errors",
					color: "cyan",
				}).start();
				activeSpinner = collectSpinner;

				const errors = await collectTypeScriptErrors(
					targetDir,
					monorepoInfo,
					(packageName, current, total) => {
						if (interrupted) return;
						collectSpinner.text = `Processing ${chalk.blue(packageName)} (${current}/${total})`;
					},
				);
				activeSpinner = null;

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
				activeSpinner = generateSpinner;
				await generateTSV(errors, outputPath);
				activeSpinner = null;
				generateSpinner.succeed(
					chalk.green("Results saved to: ") + chalk.cyan(outputPath),
				);
			} catch (error) {
				// Don't show error if user interrupted
				if (interrupted) {
					process.exit(130);
				}

				const errorMessage =
					error instanceof Error ? error.message : String(error);

				// Handle interrupted error gracefully
				if (errorMessage.includes("Interrupted by user")) {
					console.log(chalk.yellow("\n⚠ Interrupted by user"));
					process.exit(130);
				}

				if (activeSpinner) {
					activeSpinner.stop();
				}
				ora().fail(chalk.red("Error: ") + errorMessage);
				process.exit(1);
			}
		},
	);

program.parse();
