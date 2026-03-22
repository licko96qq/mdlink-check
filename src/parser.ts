export interface LinkInfo {
  url: string;
  text: string;
  line: number;
}

const FENCE_RE = /^\s*```/;
const REF_DEF_RE = /^\s*\[([^\]]+)\]:\s*(<[^>\s]+>|[^\s]+)/;
const OPEN_BRACKET_RE = /\[/g;
const HTTP_RE = /^https?:\/\//i;

function isHttpUrl(url: string): boolean {
  return HTTP_RE.test(url);
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function findMatchingBracket(line: string, openIndex: number): number {
  let depth = 1;
  for (let i = openIndex + 1; i < line.length; i += 1) {
    const char = line[i];
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function findMatchingParen(line: string, openIndex: number): number {
  let depth = 1;
  for (let i = openIndex + 1; i < line.length; i += 1) {
    const char = line[i];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function extractLinks(markdown: string): LinkInfo[] {
  const lines = markdown.split(/\r?\n/);
  const references = new Map<string, string>();

  let inCodeFence = false;
  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      continue;
    }

    const refMatch = line.match(REF_DEF_RE);
    if (!refMatch) {
      continue;
    }

    const label = refMatch[1].trim().toLowerCase();
    const url = normalizeUrl(refMatch[2]);
    if (isHttpUrl(url)) {
      references.set(label, url);
    }
  }

  const links: LinkInfo[] = [];
  inCodeFence = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (FENCE_RE.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      continue;
    }

    OPEN_BRACKET_RE.lastIndex = 0;
    let bracketMatch = OPEN_BRACKET_RE.exec(line);

    while (bracketMatch) {
      const openIndex = bracketMatch.index;
      if (openIndex > 0 && line[openIndex - 1] === "!") {
        bracketMatch = OPEN_BRACKET_RE.exec(line);
        continue;
      }

      const closeIndex = findMatchingBracket(line, openIndex);
      if (closeIndex === -1) {
        break;
      }

      const text = line.slice(openIndex + 1, closeIndex);
      const nextChar = line[closeIndex + 1];

      if (nextChar === "(") {
        const urlClose = findMatchingParen(line, closeIndex + 1);
        if (urlClose !== -1) {
          const url = normalizeUrl(line.slice(closeIndex + 2, urlClose));
          if (isHttpUrl(url)) {
            links.push({
              url,
              text,
              line: lineIndex + 1,
            });
          }
          OPEN_BRACKET_RE.lastIndex = urlClose + 1;
        } else {
          OPEN_BRACKET_RE.lastIndex = closeIndex + 1;
        }
      } else if (nextChar === "[") {
        const refClose = line.indexOf("]", closeIndex + 2);
        if (refClose !== -1) {
          const rawRef = line.slice(closeIndex + 2, refClose).trim();
          const refKey = (rawRef || text).trim().toLowerCase();
          const resolvedUrl = references.get(refKey);
          if (resolvedUrl && isHttpUrl(resolvedUrl)) {
            links.push({
              url: resolvedUrl,
              text,
              line: lineIndex + 1,
            });
          }
          OPEN_BRACKET_RE.lastIndex = refClose + 1;
        } else {
          OPEN_BRACKET_RE.lastIndex = closeIndex + 1;
        }
      } else {
        OPEN_BRACKET_RE.lastIndex = closeIndex + 1;
      }

      bracketMatch = OPEN_BRACKET_RE.exec(line);
    }
  }

  return links;
}
