/**
 * Core type definitions for TypeLense
 */

export type MonorepoType =
	| "pnpm"
	| "npm"
	| "yarn"
	| "lerna"
	| "nx"
	| "turbo"
	| "none";

export interface PackageInfo {
	name: string;
	path: string;
	version?: string;
}

export interface MonorepoInfo {
	isMonorepo: boolean;
	type: MonorepoType;
	rootPath: string;
	packages: PackageInfo[];
}

export interface TypeScriptError {
	id: number;
	packageName: string;
	fileName: string;
	errorCode: number;
	description: string;
	line?: number;
	column?: number;
	category?: string;
}

export interface MonorepoDetector {
	name: MonorepoType;
	detect(rootPath: string): Promise<boolean>;
	getPackages(rootPath: string): Promise<PackageInfo[]>;
}

export type ProgressCallback = (
	packageName: string,
	current: number,
	total: number,
) => void;

export interface ErrorCollector {
	collect(
		rootPath: string,
		monorepoInfo: MonorepoInfo,
		onProgress?: ProgressCallback,
	): Promise<TypeScriptError[]>;
}

export interface OutputGenerator {
	generate(errors: TypeScriptError[], outputPath: string): Promise<void>;
}

export interface TypeLenseConfig {
	outputPath: string;
	includeWarnings: boolean;
	excludePatterns: string[];
	customDetectors?: MonorepoDetector[];
}
