import { parse } from 'csv-parse/browser/esm/sync';

import type {
  ImportFieldMappingRequest,
  ImportSourceAdapter,
} from './import_adapter';
import { analyzeImportUrl } from './import_url';
import { IMPORT_LIMITS } from './import_limits';
import type {
  ImportAdapterKey,
  ImportCandidate,
  ImportFieldMapping,
} from './import_types';
import { ImportFileError, readTextFile } from './read_import_file';

const URL_FIELD_NAMES = ['url', 'uri', 'link', 'href', '주소', '링크'];
const TITLE_FIELD_NAMES = ['title', 'name', 'label', '제목', '이름'];
const MEMO_FIELD_NAMES = ['memo', 'note', 'notes', '메모', '노트'];
const SOURCE_KEY = 'file';

type StructuredRow = Record<string, string>;
type ParsedStructure = {
  fields: string[];
  rows: StructuredRow[];
  sourceLocations: string[];
};

export const genericCsvAdapter = createStructuredAdapter(
  'generic-csv',
  (file) =>
    file.type.toLowerCase() === 'text/csv' || /\.csv$/iu.test(file.name),
  parseCsv
);

export const genericJsonAdapter = createStructuredAdapter(
  'generic-json',
  (file) =>
    file.type.toLowerCase() === 'application/json' ||
    /\.json$/iu.test(file.name),
  parseJson
);

function createStructuredAdapter(
  adapterKey: ImportAdapterKey,
  matches: (file: File) => boolean,
  parseStructure: (text: string) => ParsedStructure
): ImportSourceAdapter {
  return {
    async detect(input) {
      if (input.kind !== 'file' || !matches(input.file)) {
        return null;
      }

      const structure = parseStructure(await readTextFile(input.file));
      const explicitMapping = findMapping(input.mappings);
      const inferredMapping = inferFieldMapping(structure);
      const mappingRequests: ImportFieldMappingRequest[] | null =
        explicitMapping || inferredMapping.unambiguous
          ? null
          : [
              {
                fields: structure.fields,
                sourceKey: SOURCE_KEY,
                suggested: inferredMapping.value,
              },
            ];

      return {
        adapterKey,
        confidence: 0.9,
        mappingRequests,
      };
    },

    async extract(input) {
      if (input.kind !== 'file' || !matches(input.file)) {
        throw new ImportFileError('unsupported-structure');
      }

      const structure = parseStructure(await readTextFile(input.file));
      const inferred = inferFieldMapping(structure);
      const mapping = findMapping(input.mappings) ?? inferred.value;

      if (!findMapping(input.mappings) && !inferred.unambiguous) {
        throw new ImportFileError('unsupported-structure');
      }

      return structure.rows.map((row, index) =>
        createCandidate({
          adapterKey,
          index,
          mapping,
          row,
          sourceLocation: structure.sourceLocations[index] ?? '',
        })
      );
    },
  };
}

function parseCsv(text: string): ParsedStructure {
  let fields: string[] = [];

  try {
    const rows = parse(text, {
      bom: true,
      columns(headers: string[]) {
        fields = headers;
        assertValidFields(fields);
        return headers;
      },
      max_record_size: IMPORT_LIMITS.fileBytes,
      relax_column_count: false,
      skip_empty_lines: true,
      trim: false,
    }) as Array<Record<string, unknown>>;

    assertRowLimit(rows);

    return {
      fields,
      rows: rows.map((row) => normalizeFlatRow(row)),
      sourceLocations: rows.map((_, index) => `CSV ${index + 2}번째 행`),
    };
  } catch (error) {
    if (error instanceof ImportFileError) {
      throw error;
    }

    throw new ImportFileError('corrupted-file');
  }
}

function parseJson(text: string): ParsedStructure {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportFileError('corrupted-file');
  }

  let rawRows: unknown[];
  let locationPrefix = '';

  if (Array.isArray(parsed)) {
    rawRows = parsed;
  } else if (isRecord(parsed)) {
    const arrays = Object.entries(parsed).filter((entry) =>
      Array.isArray(entry[1])
    );

    if (arrays.length !== 1) {
      throw new ImportFileError('unsupported-structure');
    }

    locationPrefix = arrays[0]?.[0] ?? '';
    rawRows = arrays[0]?.[1] as unknown[];
  } else {
    throw new ImportFileError('unsupported-structure');
  }

  assertRowLimit(rawRows);
  const rows = rawRows.map((row) => {
    if (!isRecord(row)) {
      throw new ImportFileError('corrupted-file');
    }

    return flattenJsonRow(row);
  });
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  assertValidFields(fields);

  return {
    fields,
    rows,
    sourceLocations: rows.map(
      (_, index) =>
        `JSON ${locationPrefix ? `${locationPrefix}[${index}]` : `[${index}]`}`
    ),
  };
}

function inferFieldMapping(structure: ParsedStructure) {
  const samples = structure.rows.slice(0, 100);
  const urlFields = structure.fields
    .map((field) => ({
      field,
      nameScore: getNameScore(field, URL_FIELD_NAMES),
      valueScore: getUrlValueScore(field, samples),
    }))
    .filter(({ valueScore }) => valueScore >= 0.8)
    .sort(
      (left, right) =>
        right.valueScore + right.nameScore - (left.valueScore + left.nameScore)
    );
  const urlField = urlFields[0]?.field ?? structure.fields[0] ?? '';

  return {
    unambiguous: urlFields.length === 1,
    value: {
      memoField: findNamedField(structure.fields, MEMO_FIELD_NAMES),
      sourceKey: SOURCE_KEY,
      titleField: findNamedField(structure.fields, TITLE_FIELD_NAMES),
      urlField,
    } satisfies ImportFieldMapping,
  };
}

function getUrlValueScore(field: string, rows: StructuredRow[]) {
  const values = rows.map((row) => row[field]).filter((value) => value);

  if (values.length === 0) {
    return 0;
  }

  return (
    values.filter((value) => analyzeImportUrl(value).ok).length / values.length
  );
}

function getNameScore(field: string, names: string[]) {
  const normalized = getFieldName(field);

  if (names.includes(normalized)) {
    return 1;
  }

  return names.some((name) => normalized.split(/[_\-\s]/u).includes(name))
    ? 0.8
    : 0;
}

function findNamedField(fields: string[], names: string[]) {
  return (
    fields
      .map((field) => ({ field, score: getNameScore(field, names) }))
      .sort((left, right) => right.score - left.score)
      .find(({ score }) => score > 0)?.field ?? null
  );
}

function createCandidate({
  adapterKey,
  index,
  mapping,
  row,
  sourceLocation,
}: {
  adapterKey: ImportAdapterKey;
  index: number;
  mapping: ImportFieldMapping;
  row: StructuredRow;
  sourceLocation: string;
}): ImportCandidate {
  const titleCandidate = readMappedValue(row, mapping.titleField);

  return {
    candidateId: `${adapterKey}:${index}`,
    capturedAtCandidate: null,
    collectionPath: [],
    explicitMemoCandidate: readMappedValue(row, mapping.memoField),
    originalUrl: row[mapping.urlField] ?? '',
    sourceLocation,
    titleCandidate,
    warnings: titleCandidate ? [] : ['missing-title'],
  };
}

function readMappedValue(row: StructuredRow, field: string | null) {
  const value = field ? row[field] : undefined;
  return value ? value : null;
}

function findMapping(mappings: ImportFieldMapping[] | undefined) {
  return mappings?.find(({ sourceKey }) => sourceKey === SOURCE_KEY);
}

function normalizeFlatRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([field, value]) => [
      field,
      value === null || value === undefined
        ? ''
        : String(value).replace(/\r\n?/gu, '\n'),
    ])
  );
}

function flattenJsonRow(row: Record<string, unknown>) {
  const result: StructuredRow = {};

  for (const [key, value] of Object.entries(row)) {
    appendJsonScalar(result, [key], value);
  }

  return result;
}

function appendJsonScalar(
  result: StructuredRow,
  path: string[],
  value: unknown
) {
  if (value === null || value === undefined) {
    result[toFieldKey(path)] = '';
    return;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    result[toFieldKey(path)] = String(value);
    return;
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      appendJsonScalar(result, [...path, key], child);
    }
  }
}

function toFieldKey(path: string[]) {
  if (path.length === 1) {
    return path[0] ?? '';
  }

  return `/${path.map(escapeJsonPointer).join('/')}`;
}

function escapeJsonPointer(value: string) {
  return value.replace(/~/gu, '~0').replace(/\//gu, '~1');
}

function getFieldName(field: string) {
  const segment = field.split('/').at(-1) ?? field;
  return segment.replace(/~1/gu, '/').replace(/~0/gu, '~').toLowerCase();
}

function assertValidFields(fields: string[]) {
  if (
    fields.length === 0 ||
    fields.some((field) => typeof field !== 'string' || field.length === 0) ||
    new Set(fields).size !== fields.length
  ) {
    throw new ImportFileError('corrupted-file');
  }
}

function assertRowLimit(rows: unknown[]) {
  if (rows.length > IMPORT_LIMITS.candidateCount) {
    throw new ImportFileError('limit-exceeded');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
