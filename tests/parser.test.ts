import { describe, expect, it } from 'vitest';
import { extractLinks } from '../src/parser.js';

describe('extractLinks', () => {
  it('extracts a simple inline link', () => {
    const markdown = 'See [OpenAI](https://openai.com).';
    expect(extractLinks(markdown)).toEqual([
      { url: 'https://openai.com', text: 'OpenAI', line: 1 },
    ]);
  });

  it('extracts multiple links from different lines with correct line numbers', () => {
    const markdown = [
      'First [one](https://example.com/one)',
      'plain line',
      'Second [two](https://example.com/two)',
    ].join('\n');

    expect(extractLinks(markdown)).toEqual([
      { url: 'https://example.com/one', text: 'one', line: 1 },
      { url: 'https://example.com/two', text: 'two', line: 3 },
    ]);
  });

  it('skips links inside fenced code blocks', () => {
    const markdown = [
      'Before [ok](https://ok.example)',
      '```ts',
      'const v = "[bad](https://bad.example)";',
      '```',
      'After [also-ok](https://after.example)',
    ].join('\n');

    expect(extractLinks(markdown)).toEqual([
      { url: 'https://ok.example', text: 'ok', line: 1 },
      { url: 'https://after.example', text: 'also-ok', line: 5 },
    ]);
  });

  it('extracts reference-style links', () => {
    const markdown = [
      'Use [docs][ref-docs] and [site][ref-site].',
      '',
      '[ref-docs]: https://example.com/docs',
      '[ref-site]: https://example.com/site',
    ].join('\n');

    expect(extractLinks(markdown)).toEqual([
      { url: 'https://example.com/docs', text: 'docs', line: 1 },
      { url: 'https://example.com/site', text: 'site', line: 1 },
    ]);
  });

  it('ignores relative links and anchors', () => {
    const markdown = [
      '[relative](/guide)',
      '[anchor](#top)',
      '[mail](mailto:test@example.com)',
      '[http](http://valid.example)',
      '[https](https://valid.example)',
    ].join('\n');

    expect(extractLinks(markdown)).toEqual([
      { url: 'http://valid.example', text: 'http', line: 4 },
      { url: 'https://valid.example', text: 'https', line: 5 },
    ]);
  });

  it('handles links with special chars in URL', () => {
    const markdown = [
      '[nested [label]](https://example.com/a_(b)?x=1&y=2#frag)',
      '[](https://example.com/empty-text)',
    ].join('\n');

    expect(extractLinks(markdown)).toEqual([
      {
        url: 'https://example.com/a_(b)?x=1&y=2#frag',
        text: 'nested [label]',
        line: 1,
      },
      { url: 'https://example.com/empty-text', text: '', line: 2 },
    ]);
  });

  it('returns empty array when there are no links', () => {
    expect(extractLinks('just plain markdown\nwith no links at all')).toEqual([]);
  });
});
