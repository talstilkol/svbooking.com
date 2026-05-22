import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '@/lib/utils/jsonLd';

describe('serializeJsonLd', () => {
  it('escapes script-breaking characters while preserving valid JSON', () => {
    const serialized = serializeJsonLd({
      name: '</script><script>alert(1)</script>',
      text: 'a & b < c > d',
    });

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(serialized).toContain('\\u003c/script\\u003e');
    expect(JSON.parse(serialized)).toEqual({
      name: '</script><script>alert(1)</script>',
      text: 'a & b < c > d',
    });
  });
});
