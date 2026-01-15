/**
 * TypeScript error collector using the TypeScript Compiler API
 */

import path from "node:path";
import { existsSync } from "node:fs";
import ts from "typescript";
import type { ErrorCollector, MonorepoInfo, TypeScriptError } from "../types";

export class TypeScriptErrorCollector implements ErrorCollector {
	private errorIdCounter = 0;

	async collect(
		rootPath: string,
		monorepoInfo: MonorepoInfo,
	): Promise<TypeScriptError[]> {
		const allErrors: TypeScriptError[] = [];
		this.errorIdCounter = 0; // Reset counter for each collection

		if (monorepoInfo.packages.length === 0) {
			// No packages found, try to check root directory
			const errors = await this.collectFromPath(rootPath, "root");
			allErrors.push(...errors);
		} else {
			// Collect errors from each package
			for (const pkg of monorepoInfo.packages) {
				const errors = await this.collectFromPath(pkg.path, pkg.name);
				allErrors.push(...errors);
			}
		}

		return allErrors;
	}

	private async collectFromPath(
		packagePath: string,
		packageName: string,
	): Promise<TypeScriptError[]> {
		const tsconfigPath = this.findTsConfig(packagePath);

		if (!tsconfigPath) {
			console.warn(
				`  ⚠ No tsconfig.json found for ${packageName}, skipping...`,
			);
			return [];
		}

		try {
			return this.collectErrorsFromProject(tsconfigPath, packageName);
		} catch (error) {
			console.error(`  ✗ Error collecting from ${packageName}:`, error);
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
): Promise<TypeScriptError[]> {
	const collector = new TypeScriptErrorCollector();
	return collector.collect(rootPath, monorepoInfo);
}
