export type LinkStatus = 'OK' | 'BROKEN' | 'TIMEOUT';

export interface CheckResult {
  url: string;
  status: LinkStatus;
  statusCode?: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CONCURRENCY = 5;
const USER_AGENT = 'mdlink-check/1.0';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function fetchWithTimeout(
  url: string,
  method: 'HEAD' | 'GET',
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function toResult(url: string, statusCode: number): CheckResult {
  if (statusCode >= 200 && statusCode < 400) {
    return { url, status: 'OK', statusCode };
  }

  return { url, status: 'BROKEN', statusCode };
}

export async function checkLink(url: string, timeout = DEFAULT_TIMEOUT_MS): Promise<CheckResult> {
  try {
    const headResponse = await fetchWithTimeout(url, 'HEAD', timeout);

    if (headResponse.status >= 400) {
      const getResponse = await fetchWithTimeout(url, 'GET', timeout);
      return toResult(url, getResponse.status);
    }

    return toResult(url, headResponse.status);
  } catch (error) {
    if (isAbortError(error)) {
      return {
        url,
        status: 'TIMEOUT',
        error: 'Request timed out',
      };
    }

    if (error instanceof Error) {
      return {
        url,
        status: 'BROKEN',
        error: error.message,
      };
    }

    return {
      url,
      status: 'BROKEN',
      error: 'Unknown error',
    };
  }
}

export async function checkLinks(
  urls: string[],
  options?: { timeout?: number; concurrency?: number },
): Promise<CheckResult[]> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const concurrency = Math.max(1, options?.concurrency ?? DEFAULT_CONCURRENCY);
  const results: CheckResult[] = new Array(urls.length);

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= urls.length) {
        return;
      }

      results[currentIndex] = await checkLink(urls[currentIndex], timeout);
    }
  }

  const workerCount = Math.min(concurrency, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
