# TypeLense

A modular and scalable TypeScript error collector for monorepos. TypeLense automatically detects your monorepo structure and extracts TypeScript errors across all packages into a convenient TSV file.

## Features

- **Multi-Monorepo Support**: Automatically detects and supports:
  - PNPM workspaces
  - Yarn workspaces
  - NPM workspaces
  - Lerna
  - Nx
  - Turborepo
- **Modular Architecture**: Pluggable detector and collector system
- **TypeScript Compiler API**: Uses official TS compiler for accurate error detection
- **Clean Output**: Generates TSV files with serial IDs for easy tracking
- **Beautiful CLI**: Color-coded output with ASCII icons and progress indicators
- **Zero Config**: Works out of the box with sensible defaults

## Installation

### Using Bun (Recommended)

```bash
bun install typelense
```

### Using NPM/PNPM/Yarn

```bash
npm install typelense
# or
pnpm add typelense
# or
yarn add typelense
```

## Usage

### Basic Usage

Run in the current directory:

```bash
typelense
```

Run in a specific directory:

```bash
typelense /path/to/monorepo
```

### CLI Options

```bash
typelense [directory] [options]
```

**Options:**

- `-o, --output <path>` - Output path for the TSV file (default: `typescript-errors.tsv`)
- `-q, --quiet` - Suppress non-error output
- `-V, --version` - Output the version number
- `-h, --help` - Display help information

### Examples

```bash
# Scan current directory and save to default file
typelense

# Scan specific directory with custom output
typelense ./my-monorepo -o errors.tsv

# Run in quiet mode
typelense -q

# Scan parent directory
typelense ..
```

## Output Format

TypeLense generates a TSV (Tab-Separated Values) file with the following columns:

| Column | Description |
|--------|-------------|
| `id` | Sequential error number (1, 2, 3...) |
| `package_name` | Name of the package where the error occurred |
| `file_name` | Relative path to the file with the error |
| `error_code` | TypeScript error code (e.g., 2322, 2345) |
| `description` | Error message description |

### Example Output

```tsv
id	package_name	file_name	error_code	description
1	@myapp/web	src/index.tsx	2322	Type 'string' is not assignable to type 'number'.
2	@myapp/api	src/server.ts	2304	Cannot find name 'Express'.
3	@myapp/shared	src/utils.ts	2532	Object is possibly 'undefined'.
```

## Supported Monorepo Types

TypeLense automatically detects the following monorepo configurations:

### Turborepo
Detected by: `turbo.json` + workspace configuration

### PNPM Workspaces
Detected by: `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### Yarn Workspaces
Detected by: `package.json` with `workspaces` field + `yarn.lock`

```json
{
  "workspaces": ["packages/*"]
}
```

### NPM Workspaces
Detected by: `package.json` with `workspaces` field

```json
{
  "workspaces": ["packages/*"]
}
```

### Lerna
Detected by: `lerna.json`

```json
{
  "packages": ["packages/*"]
}
```

### Nx
Detected by: `nx.json` or `workspace.json`

## Architecture

TypeLense is built with a modular, scalable architecture:

```
src/
├── types/           # TypeScript interfaces and types
├── detectors/       # Monorepo detection plugins
│   ├── base-detector.ts
│   ├── pnpm-detector.ts
│   ├── npm-detector.ts
│   ├── yarn-detector.ts
│   ├── lerna-detector.ts
│   ├── nx-detector.ts
│   └── turbo-detector.ts
├── collectors/      # Error collection logic
│   └── ts-error-collector.ts
└── generators/      # Output format generators
    └── tsv-generator.ts
```

### Extending TypeLense

Add custom detectors by implementing the `MonorepoDetector` interface:

```typescript
import { BaseDetector, PackageInfo } from 'typelense';

export class CustomDetector extends BaseDetector {
  name = 'custom' as const;

  async detect(rootPath: string): Promise<boolean> {
    // Your detection logic
    return this.fileExists(this.resolvePath(rootPath, 'custom.config'));
  }

  async getPackages(rootPath: string): Promise<PackageInfo[]> {
    // Your package discovery logic
    return [];
  }
}
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/typelense.git
cd typelense

# Install dependencies
bun install
```

### Running Locally

```bash
# Run the CLI
bun run start

# Run with hot reload
bun run dev

# Run on a specific directory
bun run start /path/to/test
```

### Building

```bash
bun run build
```

## Requirements

- TypeScript 5.x (peer dependency)
- Bun 1.x or Node.js 18+ (runtime)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
