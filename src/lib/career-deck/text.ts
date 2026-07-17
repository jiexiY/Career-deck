const namedHtmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: " ",
  gt: ">",
  hellip: "...",
  ldquo: '"',
  lsquo: "'",
  lt: "<",
  mdash: "-",
  nbsp: " ",
  ndash: "-",
  quot: '"',
  rdquo: '"',
  rsquo: "'",
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#")) {
      const hexadecimal = code[1]?.toLowerCase() === "x";
      const number = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);

      if (Number.isFinite(number) && number > 0 && number <= 0x10ffff) {
        return String.fromCodePoint(number);
      }

      return entity;
    }

    return namedHtmlEntities[code.toLowerCase()] ?? entity;
  });
}

export function plainText(value: string) {
  let decoded = value;

  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeHtmlEntities(decoded);

    if (next === decoded) {
      break;
    }

    decoded = next;
  }

  return decoded
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<\/?\s*(?:article|div|h[1-6]|li|ol|p|section|ul)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
