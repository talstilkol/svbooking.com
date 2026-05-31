import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const roots = ['app', 'components', 'lib', 'scripts', 'tests'];
const extraFiles = ['proxy.ts'];
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'coverage', 'test-results', 'playwright-report']);

const forbiddenSnippets = [
  {
    label: 'non-deterministic random API',
    value: ['Math', 'random'].join('.'),
  },
  {
    label: 'unapproved UUID randomness',
    value: ['crypto', 'randomUUID'].join('.'),
  },
  {
    label: 'unsupported traveler-count claim',
    value: ['10,000+', 'travelers'].join(' '),
  },
  {
    label: 'unsupported average-savings claim',
    value: ['35%', 'average', 'savings'].join(' '),
  },
  {
    label: 'unsupported max-savings claim',
    value: ['save', 'up', 'to', '40%'].join(' '),
  },
  {
    label: 'unsupported short max-savings claim',
    value: ['up', 'to', '40%'].join(' '),
  },
  {
    label: 'unsupported verified-review claim',
    value: ['verified', 'reviews'].join(' '),
  },
  {
    label: 'unsupported provider-trust claim',
    value: ['provider', 'trust'].join(' '),
  },
  {
    label: 'unsupported trust-score claim',
    value: ['trust', 'score'].join(' '),
  },
  {
    label: 'unsupported high-trust provider claim',
    value: ['highly', 'trusted', 'provider'].join(' '),
  },
  {
    label: 'unsupported legacy heatmap label',
    value: ['Best', 'Available'].join(' '),
  },
  {
    label: 'unsupported heatmap-estimate label',
    value: ['Heatmap', 'estimate'].join(' '),
  },
  {
    label: 'unsupported cached-heatmap provider label',
    value: ['Cached', 'Heatmap', 'Estimate'].join(' '),
  },
  {
    label: 'unsupported flight-estimate label',
    value: ['Flight', 'Estimates'].join(' '),
  },
  {
    label: 'unsupported non-real provider claim',
    value: ['Synthetic', 'Provider'].join(' '),
  },
  {
    label: 'unsupported generated-rating implementation',
    value: ['generate', 'believable', 'stable', 'ratings'].join(' '),
  },
  {
    label: 'unsupported static-rating implementation',
    value: ['Static', 'rating', 'badges'].join(' '),
  },
  {
    label: 'unsupported aggregate-rating schema',
    value: ['aggregate', 'Rating'].join(''),
  },
  {
    label: 'unsupported best-price-guarantee claim',
    value: ['Best', 'Price', 'Guarantee'].join(' '),
  },
  {
    label: 'unsupported fake activity claim',
    value: ['people', 'viewed', 'today'].join(' '),
  },
  {
    label: 'unsupported generated amenity fallback',
    value: ['Deterministically', 'selects', 'amenities'].join(' '),
  },
  {
    label: 'unsupported generated hotel-name fallback',
    pattern: /['"`]Unknown Hotel['"`]/i,
  },
  {
    label: 'unsupported generated safety-medical fallback',
    pattern: /['"`]None required['"`]/i,
    roots: ['app', 'components', 'lib'],
  },
  {
    label: 'unsupported generated event fallback',
    pattern: /['"`]Annual event in/i,
    roots: ['app', 'components', 'lib'],
  },
  {
    label: 'unsupported generated dining fallback',
    pattern: /['"`]Local dining spot['"`]/i,
    roots: ['app', 'components', 'lib'],
  },
  {
    label: 'unsupported generated hotel badges',
    value: ['Guest', 'Favorite'].join(' '),
  },
  {
    label: 'unsupported generated room pricing',
    value: ['price', 'Multiplier'].join(''),
  },
  {
    label: 'unsupported generated tax-rate breakdown',
    value: ['tax', 'Rate', ' = ', '0.12'].join(''),
  },
  {
    label: 'unsupported generated service-fee breakdown',
    value: ['Service', 'fee', ' (4%)'].join(' '),
  },
  {
    label: 'unsupported hidden-fee claim',
    value: ['No', 'hidden', 'fees'].join(' '),
  },
  {
    label: 'unsupported best-deal claim',
    value: ['best', 'deal'].join(' '),
  },
  {
    label: 'unsupported best-deals claim',
    value: ['best', 'deals'].join(' '),
  },
  {
    label: 'unsupported best-price claim',
    value: ['best', 'price'].join(' '),
  },
  {
    label: 'unsupported best-hotel-deal claim',
    value: ['best', 'hotel', 'deal'].join(' '),
  },
  {
    label: 'unsupported best-hotel-deals claim',
    value: ['best', 'hotel', 'deals'].join(' '),
  },
  {
    label: 'unsupported top-hotels claim',
    value: ['top', 'hotels'].join(' '),
  },
  {
    label: 'unsupported live-prices claim',
    value: ['live', 'prices'].join(' '),
  },
  {
    label: 'unsupported live-rates-from-provider claim',
    value: ['live', 'rates', 'from'].join(' '),
  },
  {
    label: 'unsupported live-pricing claim',
    value: ['live', 'pricing'].join(' '),
  },
  {
    label: 'unsupported every-provider claim',
    value: ['every', 'provider'].join(' '),
  },
  {
    label: 'unsupported static provider-logo claim',
    value: ['Compare', 'on:'].join(' '),
  },
  {
    label: 'unsupported static provider-loading claim',
    value: ['Checking', 'Booking.com'].join(' '),
  },
  {
    label: 'unsupported hardcoded booking search link',
    value: 'booking.com/searchresults',
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported hardcoded expedia search link',
    value: 'expedia.com/Hotel-Search',
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported hardcoded agoda search link',
    value: 'agoda.com/search',
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported hardcoded google hotels search link',
    value: 'google.com/travel/hotels',
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported offer availability schema claim',
    value: ['schema.org', 'InStock'].join('/'),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported limited-availability urgency claim',
    value: ['Limited', 'availability'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported price-increase urgency claim',
    value: ['prices', 'may', 'increase'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported last-chance urgency claim',
    value: ['LAST', 'CHANCE'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported static weather copy',
    value: ['Current', 'weather', 'and', 'hotel', 'availability'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported static city-guide best-for field',
    value: ['best', 'For', ':'].join(''),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported static city-guide timing field',
    value: ['best', 'Time', ':'].join(''),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported most-visited-city claim',
    value: ['world', 's', 'most', 'visited', 'cities'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported checklist travel-readiness claim',
    value: ['Ready', 'to', 'travel'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported live-price-only reasoning',
    value: ['live', 'price', 'only'].join(' '),
  },
  {
    label: 'unsupported quality-score UI',
    value: ['Trust', ':'].join(''),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported available-OTA-price claim',
    value: ['Compare', 'available', 'OTA', 'prices'].join(' '),
    roots: ['app', 'components'],
  },
  {
    label: 'unsupported provider-free-capacity claim',
    value: ['free', 'capacity'].join(' '),
  },
  {
    label: 'unsupported provider-free-quota claim',
    value: ['month', 'free'].join(' '),
  },
  {
    label: 'unsupported cheapest-available claim',
    value: ['cheapest', 'available'].join(' '),
  },
  {
    label: 'unsupported cheapest-rate claim',
    value: ['cheapest', 'rate'].join(' '),
  },
  {
    label: 'unsupported cheapest-rates claim',
    value: ['cheapest', 'rates'].join(' '),
  },
  {
    label: 'unsupported absolute-provider-validity claim',
    value: ['guaran', 'teed'].join(''),
  },
  {
    label: 'unsupported realtime-price claim',
    value: ['real', 'time'].join('-'),
  },
  {
    label: 'unsupported absolute-free claim',
    value: ['100%', 'Free'].join(' '),
  },
  {
    label: 'unsupported perfect-hotel claim',
    value: ['perfect', 'hotel'].join(' '),
  },
  {
    label: 'raw client error message exposure',
    value: ['err', 'message'].join('.'),
    roots: ['app', 'components'],
  },
  {
    label: 'unstable timestamp used in deterministic hash ID',
    pattern: /hashId\s*\([^)]*Date\s*\.\s*now\s*\(/i,
  },
];

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      yield fullPath;
    }
  }
}

function findLineNumber(source, needle) {
  const index = source.indexOf(needle);
  if (index < 0) return 1;
  return source.slice(0, index).split('\n').length;
}

function findPatternLineNumber(source, pattern) {
  pattern.lastIndex = 0;
  const match = pattern.exec(source);
  if (!match || match.index < 0) return 1;
  return source.slice(0, match.index).split('\n').length;
}

const violations = [];

for (const relativeRoot of roots) {
  const absoluteRoot = path.join(root, relativeRoot);
  for await (const filePath of walk(absoluteRoot)) {
    const source = await readFile(filePath, 'utf8');
    const sourceForScan = source.toLowerCase();
    const relativePath = path.relative(root, filePath);
    for (const snippet of forbiddenSnippets) {
      if (snippet.roots && !snippet.roots.some((scanRoot) => relativePath.startsWith(`${scanRoot}${path.sep}`))) {
        continue;
      }
      if (snippet.pattern) {
        if (!snippet.pattern.test(source)) continue;
        violations.push({
          file: relativePath,
          line: findPatternLineNumber(source, snippet.pattern),
          label: snippet.label,
        });
        continue;
      }
      const needle = snippet.value.toLowerCase();
      if (!sourceForScan.includes(needle)) continue;
      violations.push({
        file: relativePath,
        line: findLineNumber(sourceForScan, needle),
        label: snippet.label,
      });
    }
  }
}

for (const relativePath of extraFiles) {
  const filePath = path.join(root, relativePath);
  let source;
  try {
    source = await readFile(filePath, 'utf8');
  } catch {
    continue;
  }
  const sourceForScan = source.toLowerCase();
  for (const snippet of forbiddenSnippets) {
    if (snippet.roots) continue;
    if (snippet.pattern) {
      if (!snippet.pattern.test(source)) continue;
      violations.push({
        file: relativePath,
        line: findPatternLineNumber(source, snippet.pattern),
        label: snippet.label,
      });
      continue;
    }
    const needle = snippet.value.toLowerCase();
    if (!sourceForScan.includes(needle)) continue;
    violations.push({
      file: relativePath,
      line: findLineNumber(sourceForScan, needle),
      label: snippet.label,
    });
  }
}

if (violations.length > 0) {
  console.error('Guardrail violations found:');
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.label}`);
  }
  process.exit(1);
}

console.log('Guardrails passed');
