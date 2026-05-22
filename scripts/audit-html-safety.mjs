import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['app', 'components', 'lib'];
const scanExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);
const failures = [];

function fail(message) {
  failures.push(message);
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && scanExtensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

function hasSafeJsonLdContext(source, index) {
  const window = source.slice(Math.max(0, index - 160), index + 260);
  return window.includes('type="application/ld+json"') &&
    window.includes('serializeJsonLd') &&
    /__html\s*:\s*serializeJsonLd\s*\(/.test(window);
}

function relIsSafe(tag) {
  const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || '';
  return /\bnoopener\b/i.test(rel) && /\bnoreferrer\b/i.test(rel);
}

function scanSource(relativePath, source) {
  const dangerousHtmlPattern = /\bdangerouslySetInnerHTML\b/g;
  for (const match of source.matchAll(dangerousHtmlPattern)) {
    if (!hasSafeJsonLdContext(source, match.index || 0)) {
      fail(`${relativePath}:${lineNumberForIndex(source, match.index || 0)} unsafe dangerouslySetInnerHTML`);
    }
  }

  const forbiddenPatterns = [
    { label: 'raw innerHTML assignment/access', pattern: /(?<!dangerouslySet)\binnerHTML\b/g },
    { label: 'raw outerHTML assignment/access', pattern: /\bouterHTML\b/g },
    { label: 'raw insertAdjacentHTML usage', pattern: /\binsertAdjacentHTML\s*\(/g },
    { label: 'document.write usage', pattern: /\bdocument\s*\.\s*write\s*\(/g },
    { label: 'eval usage', pattern: /\beval\s*\(/g },
    { label: 'new Function usage', pattern: /\bnew\s+Function\s*\(/g },
    { label: 'JSON.stringify used for script HTML', pattern: /__html\s*:\s*JSON\s*\.\s*stringify\s*\(/g },
  ];

  for (const rule of forbiddenPatterns) {
    for (const match of source.matchAll(rule.pattern)) {
      fail(`${relativePath}:${lineNumberForIndex(source, match.index || 0)} ${rule.label}`);
    }
  }

  const targetBlankPattern = /<[A-Za-z][\w.:-]*\b[^>]*\btarget\s*=\s*["']_blank["'][^>]*>/gs;
  for (const match of source.matchAll(targetBlankPattern)) {
    const tag = match[0];
    if (!relIsSafe(tag)) {
      fail(`${relativePath}:${lineNumberForIndex(source, match.index || 0)} target="_blank" without noopener noreferrer`);
    }
  }
}

for (const relativeRoot of scanRoots) {
  const absoluteRoot = path.join(root, relativeRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const relativePath = path.relative(root, filePath);
    const source = await readFile(filePath, 'utf8');
    scanSource(relativePath, source);
  }
}

if (failures.length > 0) {
  console.error('HTML safety audit failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('HTML safety audit passed');
