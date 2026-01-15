---
description: TypeLense - TypeScript error collector for monorepos
globs: "*.ts, *.tsx, package.json, build.ts"
alwaysApply: true
---

# TypeLense Development Guide

TypeLense is a modular and scalable TypeScript error collector for monorepos. It automatically detects monorepo configurations and extracts TypeScript errors into TSV files.

## Project Structure

```
src/
├── cli.ts              # CLI entry point (built to dist/cli.js)
├── index.ts            # Library exports
├── types/              # TypeScript interfaces
├── detectors/          # Monorepo detection plugins
│   ├── base-detector.ts
│   ├── pnpm-detector.ts
│   ├── npm-detector.ts
│   ├── yarn-detector.ts
│   ├── lerna-detector.ts
│   ├── nx-detector.ts
│   └── turbo-detector.ts
├── collectors/         # Error collection logic
│   └── ts-error-collector.ts
└── generators/         # Output format generators
    └── tsv-generator.ts
```

## Development Setup

Use Bun for development:

```bash
bun install           # Install dependencies
bun run start        # Run CLI
bun run dev          # Run with hot reload
bun run build        # Build for production
```

## Important: Node.js Compatibility

**This project must work with both Bun AND Node.js!**

### DO NOT use Bun-specific APIs:
- ❌ `Bun.file()` - Use `readFileSync()` from `node:fs` instead
- ❌ `Bun.write()` - Use `writeFile()` from `node:fs/promises` instead
- ❌ `Bun.Glob` - Use `fast-glob` package instead
- ❌ `Bun.$` - Use standard Node.js child_process if needed

### DO use standard Node.js APIs:
- ✅ `readFileSync()` from `node:fs`
- ✅ `writeFile()` from `node:fs/promises`
- ✅ `fast-glob` for globbing
- ✅ Import from `node:fs`, `node:path`, etc.

## Architecture Principles

### Modular Design
- **Detectors**: Pluggable monorepo detection (PNPM, Yarn, NPM, Lerna, Nx, Turbo)
- **Collectors**: Extensible error collection using TypeScript Compiler API
- **Generators**: Flexible output formats (currently TSV, easy to add CSV, JSON)

### Adding New Features

#### New Monorepo Detector
1. Create new file in `src/detectors/`
2. Extend `BaseDetector` class
3. Implement `detect()` and `getPackages()` methods
4. Add to `DEFAULT_DETECTORS` in `src/detectors/index.ts`

```ts
export class CustomDetector extends BaseDetector {
  name = 'custom' as const;

  async detect(rootPath: string): Promise<boolean> {
    return this.fileExists(this.resolvePath(rootPath, 'custom.config'));
  }

  async getPackages(rootPath: string): Promise<PackageInfo[]> {
    // Implementation
  }
}
```

#### New Output Format
1. Create new file in `src/generators/`
2. Implement `OutputGenerator` interface
3. Export from `src/generators/index.ts`

## Build System

The build system (`build.ts`):
- Finds all `.ts` files in `src/`
- Builds to `dist/` preserving folder structure
- Automatically reads dependencies from `package.json` for externals
- Uses Bun for fast builds, but outputs Node.js compatible ESM

```bash
bun run build
```

Output structure mirrors source:
```
dist/
├── cli.js              # CLI entry (executable)
├── index.js            # Library entry
├── types/index.js
├── detectors/...
├── collectors/...
└── generators/...
```

## Testing

Run the CLI locally:

```bash
# During development (uses src/ directly)
bun run start

# Test built version
bun run build
node dist/cli.js --help
node dist/cli.js /path/to/test

# Test as if installed via npm
npm link
typelense --help
```

## Dependencies

**Runtime Dependencies** (bundled with package):
- `commander` - CLI framework
- `ora` - Terminal spinners
- `chalk` - Terminal colors
- `fast-glob` - File globbing (Node.js compatible)
- `yaml` - YAML parsing for PNPM workspaces

**Peer Dependencies** (required by user):
- `typescript` ^5 - TypeScript compiler API

**Dev Dependencies**:
- `@biomejs/biome` - Linting and formatting
- `release-it` - Release automation

## Code Style

- Use Biome for linting and formatting
- Prefer `node:` protocol for built-in modules (`node:fs`, `node:path`)
- Use `async/await` over callbacks
- Export types and interfaces from `src/types/index.ts`
- Keep detectors independent and self-contained
- Use descriptive variable names

## Publishing

```bash
bun run build          # Build first
npm publish            # Publish to npm
```

The `prepublishOnly` script automatically runs build before publishing.

## CLI Usage

```bash
typelense [directory] [options]

Options:
  -o, --output <path>  Output TSV file path
  -q, --quiet          Suppress non-error output
```

## Output Format

TSV file with columns:
- `id` - Sequential number (1, 2, 3...)
- `package_name` - Package where error occurred
- `file_name` - Relative file path
- `error_code` - TypeScript error code
- `description` - Error message
