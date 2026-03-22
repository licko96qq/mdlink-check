import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractLinks } from '../src/parser.js';
import { checkLinks } from '../src/checker.js';
import { formatResults } from '../src/reporter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function hasFailures(statuses: Array<{ status: 'OK' | 'BROKEN' | 'TIMEOUT' }>): boolean {
  return statuses.some((result) => result.status !== 'OK');
}

describe('integration pipeline', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('parses markdown, checks links, and formats output', async () => {
    const markdown = [
      '[good](https://good.example)',
      '[bad](https://bad.example)',
    ].join('\n');

    mockFetch
      .mockResolvedValueOnce({ status: 200 } as Response)
      .mockResolvedValueOnce({ status: 404 } as Response)
      .mockResolvedValueOnce({ status: 404 } as Response);

    const links = extractLinks(markdown);
    const results = await checkLinks(links.map((link) => link.url));
    const output = formatResults(results, true);

    expect(output).toContain('[OK]');
    expect(output).toContain('[BROKEN]');
    expect(output).toContain('https://good.example');
    expect(output).toContain('https://bad.example');
    expect(output).toContain('2 links checked: 1 ok, 1 broken, 0 timeout');
  });

  it('indicates failure when there are broken links', async () => {
    const markdown = '[broken](https://broken.example)';

    mockFetch
      .mockResolvedValueOnce({ status: 500 } as Response)
      .mockResolvedValueOnce({ status: 500 } as Response);

    const links = extractLinks(markdown);
    const results = await checkLinks(links.map((link) => link.url));

    expect(hasFailures(results)).toBe(true);
  });

  it('returns clean output when markdown has no links', async () => {
    const markdown = 'No links here.';

    const links = extractLinks(markdown);
    const results = await checkLinks(links.map((link) => link.url));
    const output = formatResults(results, false);

    expect(links).toEqual([]);
    expect(results).toEqual([]);
    expect(output).toBe('0 links checked: 0 ok, 0 broken, 0 timeout');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
