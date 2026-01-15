/**
 * Monorepo detector orchestrator
 */

import path from "node:path";
import { readFileSync } from "node:fs";
import type { MonorepoDetector, MonorepoInfo, PackageInfo } from "../types";
import { LernaDetector } from "./lerna-detector";
import { NpmDetector, YarnDetector } from "./npm-detector";
import { NxDetector } from "./nx-detector";
import { PnpmDetector } from "./pnpm-detector";
import { TurboDetector } from "./turbo-detector";

export * from "./base-detector";
export * from "./lerna-detector";
export * from "./npm-detector";
export * from "./nx-detector";
export * from "./pnpm-detector";
export * from "./turbo-detector";

/**
 * Default detectors in priority order
 */
const DEFAULT_DETECTORS: MonorepoDetector[] = [
	new TurboDetector(), // Check Turbo first as it wraps other tools
	new PnpmDetector(),
	new YarnDetector(),
	new NpmDetector(),
	new LernaDetector(),
	new NxDetector(),
];

/**
 * Detect monorepo type and get package information
 */
export async function detectMonorepo(
	rootPath: string,
	customDetectors: MonorepoDetector[] = [],
): Promise<MonorepoInfo> {
	const detectors = [...customDetectors, ...DEFAULT_DETECTORS];

	for (const detector of detectors) {
		const isDetected = await detector.detect(rootPath);

		if (isDetected) {
			const packages = await detector.getPackages(rootPath);

			return {
				isMonorepo: true,
				type: detector.name,
				rootPath,
				packages,
			};
		}
	}

	// No monorepo detected, check for single package
	const packageJsonPath = path.resolve(rootPath, "package.json");

	try {
		const content = readFileSync(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(content);
		const singlePackage: PackageInfo = {
			name: packageJson.name || "unknown",
			path: rootPath,
			version: packageJson.version,
		};

		return {
			isMonorepo: false,
			type: "none",
			rootPath,
			packages: [singlePackage],
		};
	} catch {
		return {
			isMonorepo: false,
			type: "none",
			rootPath,
			packages: [],
		};
	}
}
