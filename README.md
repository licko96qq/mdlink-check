# mdlink-check

A CLI tool that scans Markdown files for HTTP links and checks whether they are accessible.

## Features

- Extracts inline links `[text](url)` and reference-style links `[text][ref]`
- Skips links inside fenced code blocks
- HTTP HEAD check with GET fallback
- Configurable timeout and concurrency
- Glob pattern support for batch checking
- Colored terminal output (OK / BROKEN / TIMEOUT)

## Installation

```bash
git clone https://github.com/licko96qq/mdlink-check.git
cd mdlink-check
npm install
npm run build
```

## Usage

```bash
# Check a single file
node dist/index.js README.md

# Check multiple files with glob
node dist/index.js "docs/**/*.md"

# With options
node dist/index.js "docs/**/*.md" --timeout 3000 --verbose --concurrency 10
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--timeout <ms>` | 5000 | Request timeout in milliseconds |
| `--verbose` | false | Show detailed status codes and error messages |
| `--concurrency <n>` | 5 | Number of concurrent HTTP requests |

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All links are accessible |
| 1 | One or more links are broken or timed out |

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

## Project Structure

```
mdlink-check/
├── src/
│   ├── index.ts        # CLI entry point (commander)
│   ├── parser.ts       # Extract links from Markdown
│   ├── checker.ts      # HTTP HEAD/GET link verification
│   └── reporter.ts     # Colored output formatting
├── tests/
│   ├── parser.test.ts  # 7 test cases
│   ├── checker.test.ts # 5 test cases
│   └── integration.test.ts # 3 test cases
└── fixtures/
    └── sample.md       # Test fixture with good and bad links
```

## Tech Stack

- **Language**: TypeScript (strict mode, ESM)
- **CLI**: commander
- **HTTP**: Native fetch (Node 18+)
- **Output**: chalk
- **Testing**: vitest
- **CI**: GitHub Actions

## License

MIT
