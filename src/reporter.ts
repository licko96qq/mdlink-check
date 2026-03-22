import chalk from 'chalk';
import type { CheckResult } from './checker.js';

function colorStatus(status: CheckResult['status']): string {
  if (status === 'OK') {
    return chalk.green(status);
  }

  if (status === 'BROKEN') {
    return chalk.red(status);
  }

  return chalk.yellow(status);
}

export function formatResults(results: CheckResult[], verbose: boolean): string {
  const lines: string[] = [];

  let ok = 0;
  let broken = 0;
  let timeout = 0;

  for (const result of results) {
    if (result.status === 'OK') {
      ok += 1;
    } else if (result.status === 'BROKEN') {
      broken += 1;
    } else {
      timeout += 1;
    }

    let line = `  [${colorStatus(result.status)}] ${result.url}`;

    if (verbose) {
      const details: string[] = [];

      if (result.statusCode !== undefined) {
        details.push(`statusCode=${result.statusCode}`);
      }

      if (result.error) {
        details.push(`error=${result.error}`);
      }

      if (details.length > 0) {
        line += ` (${details.join(', ')})`;
      }
    }

    lines.push(line);
  }

  lines.push(`${results.length} links checked: ${ok} ok, ${broken} broken, ${timeout} timeout`);

  return lines.join('\n');
}
