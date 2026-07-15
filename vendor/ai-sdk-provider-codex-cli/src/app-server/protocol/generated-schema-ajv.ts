import Ajv from 'ajv';

/**
 * Create an Ajv instance configured for the pinned Codex generated schemas.
 *
 * Decoding and outbound construction must observe wire values without
 * coercion, default injection, or property removal. The generated schemas use
 * Rust numeric format names that Ajv does not provide by default.
 */
export function createGeneratedSchemaAjv(): Ajv {
  const ajv = new Ajv({
    strict: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
  });

  // These bounds enforce the range that remains observable after JSON.parse.
  // Distinguishing adjacent unsafe int64/uint64 literals requires the deferred
  // raw-byte RequestId/parser hardening rather than pretending a JS number kept
  // their lexical identity.
  const numericFormats = {
    double: (value: number) => Number.isFinite(value),
    int32: (value: number) =>
      Number.isInteger(value) && value >= -2_147_483_648 && value <= 2_147_483_647,
    int64: (value: number) =>
      Number.isInteger(value) &&
      value >= Number('-9223372036854775808') &&
      value <= Number('9223372036854775807'),
    uint: (value: number) =>
      Number.isInteger(value) && value >= 0 && value <= Number('18446744073709551615'),
    uint16: (value: number) => Number.isInteger(value) && value >= 0 && value <= 65_535,
    uint32: (value: number) => Number.isInteger(value) && value >= 0 && value <= 4_294_967_295,
    uint64: (value: number) =>
      Number.isInteger(value) && value >= 0 && value <= Number('18446744073709551615'),
  } as const;

  for (const [name, validate] of Object.entries(numericFormats)) {
    ajv.addFormat(name, { type: 'number', validate });
  }

  return ajv;
}
