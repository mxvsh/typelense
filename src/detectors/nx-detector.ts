/**
 * NX monorepo detector
 */

import path from "node:path";
import fg from "fast-glob";
import type { PackageInfo } from "../types";
import { BaseDetector } from "./base-detector";

interface NxJson {
	projects?: Record<string, string>;
}

export class NxDetector extends BaseDetector {
	name = "nx" as const;

	async detect(rootPath: string): Promise<boolean> {
		return (
			this.fileExists(this.resolvePath(rootPath, "nx.json")) ||
			this.fileExists(this.resolvePath(rootPath, "workspace.json"))
		);
	}

	async getPackages(rootPath: string): Promise<PackageInfo[]> {
		const nxJsonPath = this.resolvePath(rootPath, "nx.json");
		const workspaceJsonPath = this.resolvePath(rootPath, "workspace.json");

		const nxJson = await this.readJSON<NxJson>(nxJsonPath);
		const workspaceJson = await this.readJSON<NxJson>(workspaceJsonPath);

		const projectPaths = nxJson?.projects || workspaceJson?.projects || {};
		const packages: PackageInfo[] = [];

		// NX can define projects in different ways
		for (const [projectName, projectPath] of Object.entries(projectPaths)) {
			const fullPath = path.resolve(rootPath, projectPath);
			const packageJsonPath = path.join(fullPath, "package.json");

			if (this.fileExists(packageJsonPath)) {
				const pkgJson = await this.readJSON<{ name: string; version?: string }>(
					packageJsonPath,
				);
				packages.push({
					name: pkgJson?.name || projectName,
					path: fullPath,
					version: pkgJson?.version,
				});
			} else {
				// NX project without package.json
				packages.push({
					name: projectName,
					path: fullPath,
				});
			}
		}

		// Also scan for any packages/ apps/ libs/ directories
		if (packages.length === 0) {
			const patterns = [
				"packages/*/package.json",
				"apps/*/package.json",
				"libs/*/package.json",
			];

			for (const pattern of patterns) {
				const files = await fg(pattern, {
					cwd: rootPath,
					absolute: false,
				});

				for (const file of files) {
					const packagePath = path.dirname(path.resolve(rootPath, file));
					const pkgJson = await this.readJSON<{
						name: string;
						version?: string;
					}>(path.resolve(rootPath, file));

					if (pkgJson?.name) {
						packages.push({
							name: pkgJson.name,
							path: packagePath,
							version: pkgJson.version,
						});
					}
				}
			}
		}

		return packages;
	}
}
