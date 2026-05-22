export function hashId(...parts: Array<string | number | boolean | null | undefined>): string {
  const input = parts.map((part) => String(part ?? '')).join('\u001f');
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `h_${(hash >>> 0).toString(36)}`;
}
