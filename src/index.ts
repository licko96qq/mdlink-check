#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkLinks } from './checker.js';
import { extractLinks } from './parser.js';
import { formatResults, formatResultsJson } from './reporter.js';

interface CliOptions {
  timeout: number;
  verbose: boolean;
  concurrency: number;
  json: boolean;
}

function toPositiveInteger(value: string, optionName: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer`);
  }

  return parsed;
}

function hasFailures(statuses: Array<{ status: 'OK' | 'BROKEN' | 'TIMEOUT' }>): boolean {
  return statuses.some((result) => result.status !== 'OK');
}

async function resolveFiles(patterns: string[]): Promise<string[]> {
  const files = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, { nodir: true });
    for (const file of matches) {
      files.add(resolve(file));
    }
  }

  return [...files];
}

export async function runCli(argv = process.argv): Promise<number> {
  const program = new Command();

  program
    .name('mdlink-check')
    .description('Check HTTP links in Markdown files')
    .argument('<patterns...>', 'Glob patterns for markdown files')
    .option('--timeout <ms>', 'Request timeout in milliseconds', '5000')
    .option('--verbose', 'Show detailed check results', false)
    .option('--concurrency <n>', 'Concurrent requests', '5')
    .option('--json', 'Output results as JSON', false);

  let patterns: string[];
  let options: CliOptions;

  try {
    program.parse(argv);
    patterns = program.args as string[];

    const parsedOptions = program.opts<{
      timeout: string;
      verbose: boolean;
      concurrency: string;
      json: boolean;
    }>();

    options = {
      timeout: toPositiveInteger(parsedOptions.timeout, '--timeout'),
      verbose: parsedOptions.verbose,
      concurrency: toPositiveInteger(parsedOptions.concurrency, '--concurrency'),
      json: parsedOptions.json,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Failed to parse CLI options');
    }
    return 1;
  }

  let files: string[];

  try {
    files = await resolveFiles(patterns);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to resolve patterns: ${error.message}`);
    } else {
      console.error('Failed to resolve patterns');
    }
    return 1;
  }

  if (files.length === 0) {
    console.error('No files matched the provided patterns');
    return 1;
  }

  const urls = new Set<string>();

  for (const file of files) {
    try {
      const markdown = await readFile(file, 'utf8');
      const links = extractLinks(markdown);

      for (const link of links) {
        urls.add(link.url);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to read ${file}: ${error.message}`);
      } else {
        console.error(`Failed to read ${file}`);
      }
      return 1;
    }
  }

  const results = await checkLinks([...urls], {
    timeout: options.timeout,
    concurrency: options.concurrency,
  });

  if (options.json) {
    console.log(formatResultsJson(results));
  } else {
    console.log(formatResults(results, options.verbose));
  }

  return hasFailures(results) ? 1 : 0;
}

void runCli().then((exitCode) => {
  process.exitCode = exitCode;
});
