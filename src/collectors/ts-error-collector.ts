/**
 * TypeScript error collector using the TypeScript Compiler API
 */

import path from "node:path";
import { existsSync } from "node:fs";
import ts from "typescript";
import type { ErrorCollector, MonorepoInfo, TypeScriptError } from "../types";

export class TypeScriptErrorCollector implements ErrorCollector {
	private errorIdCounter = 0;
	private interrupted = false;

	async collect(
		rootPath: string,
		monorepoInfo: MonorepoInfo,
		onProgress?: (packageName: string, current: number, total: number) => void,
	): Promise<TypeScriptError[]> {
		const allErrors: TypeScriptError[] = [];
		this.errorIdCounter = 0; // Reset counter for each collection
		this.interrupted = false;

		// Listen for interruption
		const interruptHandler = () => {
			this.interrupted = true;
		};
		process.on("SIGINT", interruptHandler);

		try {
			if (monorepoInfo.packages.length === 0) {
				// No packages found, try to check root directory
				onProgress?.("root", 1, 1);
				const errors = await this.collectFromPath(rootPath, "root");
				allErrors.push(...errors);
			} else {
				// Collect errors from each package
				const total = monorepoInfo.packages.length;
				for (let i = 0; i < monorepoInfo.packages.length; i++) {
					if (this.interrupted) {
						throw new Error("Interrupted by user");
					}

					const pkg = monorepoInfo.packages[i];
					onProgress?.(pkg.name, i + 1, total);

					// Yield to event loop to allow spinner to update
					await new Promise((resolve) => setImmediate(resolve));

					const errors = await this.collectFromPath(pkg.path, pkg.name);
					allErrors.push(...errors);
				}
			}

			return allErrors;
		} finally {
			process.off("SIGINT", interruptHandler);
		}
	}

	private async collectFromPath(
		packagePath: string,
		packageName: string,
	): Promise<TypeScriptError[]> {
		if (this.interrupted) {
			return [];
		}

		const tsconfigPath = this.findTsConfig(packagePath);

		if (!tsconfigPath) {
			// Don't warn in quiet mode or if interrupted
			if (!this.interrupted) {
				console.warn(
					`  ⚠ No tsconfig.json found for ${packageName}, skipping...`,
				);
			}
			return [];
		}

		try {
			if (this.interrupted) {
				return [];
			}

			// Note: TypeScript compilation is synchronous and will block the event loop
			// We yield before calling this function to allow spinner to update
			const errors = this.collectErrorsFromProject(tsconfigPath, packageName);
			return errors;
		} catch (error) {
			if (!this.interrupted) {
				console.error(`  ✗ Error collecting from ${packageName}:`, error);
			}
			return [];
		}
	}

	private findTsConfig(packagePath: string): string | null {
		const tsconfigPath = path.join(packagePath, "tsconfig.json");

		if (existsSync(tsconfigPath)) {
			return tsconfigPath;
		}

		return null;
	}

	private collectErrorsFromProject(
		tsconfigPath: string,
		packageName: string,
	): TypeScriptError[] {
		const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

		if (configFile.error) {
			throw new Error(
				`Failed to read tsconfig.json: ${configFile.error.messageText}`,
			);
		}

		const parsedConfig = ts.parseJsonConfigFileContent(
			configFile.config,
			ts.sys,
			path.dirname(tsconfigPath),
		);

		if (parsedConfig.errors.length > 0) {
			// Handle tsconfig parsing errors
			return this.formatDiagnostics(parsedConfig.errors, packageName);
		}

		// Create program
		const program = ts.createProgram({
			rootNames: parsedConfig.fileNames,
			options: parsedConfig.options,
		});

		// Get all diagnostics
		const diagnostics = [
			...program.getSemanticDiagnostics(),
			...program.getSyntacticDiagnostics(),
			...program.getDeclarationDiagnostics(),
			...program.getConfigFileParsingDiagnostics(),
		];

		return this.formatDiagnostics(diagnostics, packageName);
	}

	private formatDiagnostics(
		diagnostics: readonly ts.Diagnostic[],
		packageName: string,
	): TypeScriptError[] {
		return diagnostics.map((diagnostic) => {
			const message =
				typeof diagnostic.messageText === "string"
					? diagnostic.messageText
					: diagnostic.messageText.messageText;

			let fileName = "unknown";
			let line: number | undefined;
			let column: number | undefined;

			if (diagnostic.file && diagnostic.start !== undefined) {
				fileName = path.relative(process.cwd(), diagnostic.file.fileName);
				const { line: lineNum, character } =
					diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
				line = lineNum + 1;
				column = character + 1;
			}

			const category = ts.DiagnosticCategory[diagnostic.category].toLowerCase();

			return {
				id: ++this.errorIdCounter,
				packageName,
				fileName,
				errorCode: diagnostic.code,
				description: message,
				line,
				column,
				category,
			};
		});
	}
}

/**
 * Export convenience function
 */
export async function collectTypeScriptErrors(
	rootPath: string,
	monorepoInfo: MonorepoInfo,
	onProgress?: (packageName: string, current: number, total: number) => void,
): Promise<TypeScriptError[]> {
	const collector = new TypeScriptErrorCollector();
	return collector.collect(rootPath, monorepoInfo, onProgress);
}
