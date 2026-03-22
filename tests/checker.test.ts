import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkLink, checkLinks } from '../src/checker.js';

const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

describe('checkLink', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns OK for 200 response', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 } as Response);

    const result = await checkLink('https://example.com');

    expect(result).toEqual({
      url: 'https://example.com',
      status: 'OK',
      statusCode: 200,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        method: 'HEAD',
        headers: { 'User-Agent': 'mdlink-check/1.0' },
      }),
    );
  });

  it('returns BROKEN for 404 response', async () => {
    mockFetch
      .mockResolvedValueOnce({ status: 404 } as Response)
      .mockResolvedValueOnce({ status: 404 } as Response);

    const result = await checkLink('https://example.com/missing');

    expect(result).toEqual({
      url: 'https://example.com/missing',
      status: 'BROKEN',
      statusCode: 404,
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/missing',
      expect.objectContaining({ method: 'HEAD' }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://example.com/missing',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns TIMEOUT when request times out', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await checkLink('https://slow.example', 10);

    expect(result).toEqual({
      url: 'https://slow.example',
      status: 'TIMEOUT',
      error: 'Request timed out',
    });
  });

  it('handles network errors (DNS failure)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND invalid.example'));

    const result = await checkLink('https://invalid.example');

    expect(result).toEqual({
      url: 'https://invalid.example',
      status: 'BROKEN',
      error: 'getaddrinfo ENOTFOUND invalid.example',
    });
  });
});

describe('checkLinks', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns results in input order with concurrency pool', async () => {
    const delays = [40, 10, 20];
    mockFetch.mockImplementation((url: string) => {
      const index = Number(url.split('/').pop());
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ status: 200 + index } as Response);
        }, delays[index]);
      });
    });

    const urls = ['https://example.com/0', 'https://example.com/1', 'https://example.com/2'];

    const results = await checkLinks(urls, { concurrency: 2 });

    expect(results).toEqual([
      { url: urls[0], status: 'OK', statusCode: 200 },
      { url: urls[1], status: 'OK', statusCode: 201 },
      { url: urls[2], status: 'OK', statusCode: 202 },
    ]);
  });
});
