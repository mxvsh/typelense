import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Function to recursively find all .ts files
function findTsFiles(dir: string, fileList: string[] = []): string[] {
	const files = readdirSync(dir);

	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			findTsFiles(filePath, fileList);
		} else if (file.endsWith(".ts")) {
			fileList.push(filePath);
		}
	}

	return fileList;
}

// Read dependencies from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
const external = [
	...Object.keys(packageJson.dependencies || {}),
	...Object.keys(packageJson.peerDependencies || {}),
	...Object.keys(packageJson.devDependencies || {}),
];

// Get all TypeScript files in src
const entrypoints = findTsFiles("./src");

await Bun.build({
	entrypoints,
	outdir: "./dist",
	target: "node",
	format: "esm",
	root: "./src",
	external,
	naming: "[dir]/[name].js",
});

console.log("✓ Build complete");
