/**
 * Base detector class for monorepo detection
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { MonorepoDetector, MonorepoType, PackageInfo } from "../types";

export abstract class BaseDetector implements MonorepoDetector {
	abstract name: MonorepoType;

	abstract detect(rootPath: string): Promise<boolean>;

	abstract getPackages(rootPath: string): Promise<PackageInfo[]>;

	protected fileExists(filePath: string): boolean {
		return existsSync(filePath);
	}

	protected async readJSON<T>(filePath: string): Promise<T | null> {
		try {
			const content = readFileSync(filePath, "utf-8");
			return JSON.parse(content) as T;
		} catch {
			return null;
		}
	}

	protected resolvePath(rootPath: string, ...paths: string[]): string {
		return path.resolve(rootPath, ...paths);
	}
}
