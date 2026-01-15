/**
 * TSV file generator for TypeScript errors
 */

import { writeFile } from "node:fs/promises";
import type { OutputGenerator, TypeScriptError } from "../types";

export class TsvGenerator implements OutputGenerator {
	async generate(errors: TypeScriptError[], outputPath: string): Promise<void> {
		const headers = [
			"id",
			"package_name",
			"file_name",
			"error_code",
			"description",
		];
		const rows: string[] = [headers.join("\t")];

		for (const error of errors) {
			const row = [
				error.id.toString(),
				this.escapeField(error.packageName),
				this.escapeField(error.fileName),
				error.errorCode.toString(),
				this.escapeField(error.description),
			];
			rows.push(row.join("\t"));
		}

		const content = rows.join("\n");
		await writeFile(outputPath, content, "utf-8");
	}

	private escapeField(field: string): string {
		// Escape tabs, newlines, and carriage returns in TSV fields
		return field.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "");
	}
}

/**
 * Export convenience function
 */
export async function generateTSV(
	errors: TypeScriptError[],
	outputPath: string,
): Promise<void> {
	const generator = new TsvGenerator();
	return generator.generate(errors, outputPath);
}
