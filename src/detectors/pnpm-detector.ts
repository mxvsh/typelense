/**
 * PNPM workspace detector
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { parse } from "yaml";
import type { PackageInfo } from "../types";
import { BaseDetector } from "./base-detector";

interface PnpmWorkspace {
	packages?: string[];
}

export class PnpmDetector extends BaseDetector {
	name = "pnpm" as const;

	async detect(rootPath: string): Promise<boolean> {
		return this.fileExists(this.resolvePath(rootPath, "pnpm-workspace.yaml"));
	}

	async getPackages(rootPath: string): Promise<PackageInfo[]> {
		const workspaceFile = this.resolvePath(rootPath, "pnpm-workspace.yaml");

		if (!this.fileExists(workspaceFile)) {
			return [];
		}

		try {
			const content = readFileSync(workspaceFile, "utf-8");
			const workspace = parse(content) as PnpmWorkspace;

			if (!workspace.packages || workspace.packages.length === 0) {
				return [];
			}

			const packages: PackageInfo[] = [];

			for (const pattern of workspace.packages) {
				const files = await fg(path.join(pattern, "package.json"), {
					cwd: rootPath,
					absolute: false,
				});

				for (const file of files) {
					const packagePath = path.dirname(path.resolve(rootPath, file));
					const packageJson = await this.readJSON<{
						name: string;
						version?: string;
					}>(path.resolve(rootPath, file));

					if (packageJson?.name) {
						packages.push({
							name: packageJson.name,
							path: packagePath,
							version: packageJson.version,
						});
					}
				}
			}

			return packages;
		} catch (error) {
			console.error("Error reading pnpm-workspace.yaml:", error);
			return [];
		}
	}
}
