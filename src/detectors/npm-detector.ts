/**
 * NPM/Yarn workspaces detector
 */

import path from "node:path";
import fg from "fast-glob";
import type { PackageInfo } from "../types";
import { BaseDetector } from "./base-detector";

interface PackageJson {
	name?: string;
	version?: string;
	workspaces?: string[] | { packages?: string[] };
}

export class NpmDetector extends BaseDetector {
	name = "npm" as const;

	async detect(rootPath: string): Promise<boolean> {
		const packageJsonPath = this.resolvePath(rootPath, "package.json");
		const packageJson = await this.readJSON<PackageJson>(packageJsonPath);

		if (!packageJson) return false;

		return !!(
			packageJson.workspaces &&
			(Array.isArray(packageJson.workspaces) || packageJson.workspaces.packages)
		);
	}

	async getPackages(rootPath: string): Promise<PackageInfo[]> {
		const packageJsonPath = this.resolvePath(rootPath, "package.json");
		const packageJson = await this.readJSON<PackageJson>(packageJsonPath);

		if (!packageJson?.workspaces) {
			return [];
		}

		const workspacePatterns = Array.isArray(packageJson.workspaces)
			? packageJson.workspaces
			: packageJson.workspaces.packages || [];

		const packages: PackageInfo[] = [];

		for (const pattern of workspacePatterns) {
			const files = await fg(path.join(pattern, "package.json"), {
				cwd: rootPath,
				absolute: false,
			});

			for (const file of files) {
				const packagePath = path.dirname(path.resolve(rootPath, file));
				const pkgJson = await this.readJSON<{ name: string; version?: string }>(
					path.resolve(rootPath, file),
				);

				if (pkgJson?.name) {
					packages.push({
						name: pkgJson.name,
						path: packagePath,
						version: pkgJson.version,
					});
				}
			}
		}

		return packages;
	}
}

export class YarnDetector extends NpmDetector {
	name = "yarn" as const;

	async detect(rootPath: string): Promise<boolean> {
		const hasWorkspaces = await super.detect(rootPath);
		const hasYarnLock = this.fileExists(
			this.resolvePath(rootPath, "yarn.lock"),
		);

		return hasWorkspaces && hasYarnLock;
	}
}
