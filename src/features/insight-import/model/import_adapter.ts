import type {
  ImportAdapterKey,
  ImportCandidate,
  ImportFieldMapping,
  ImportInput,
} from './import_types';

export type ImportFieldMappingRequest = {
  fields: string[];
  sourceKey: string;
  suggested: ImportFieldMapping;
};

export type ImportDetection =
  | {
      adapterKey: ImportAdapterKey;
      confidence: number;
      mappingRequests: null;
    }
  | {
      adapterKey: ImportAdapterKey;
      confidence: number;
      mappingRequests: ImportFieldMappingRequest[];
    };

export type ImportSourceAdapter = {
  detect(input: ImportInput): Promise<ImportDetection | null>;
  extract(input: ImportInput): Promise<ImportCandidate[]>;
};
