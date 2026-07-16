import { knuNoticesSourceAdapter } from "./adapters/knuNoticesSource.js";

const sourceAdapters = [knuNoticesSourceAdapter];

export function getNoticeSourceAdapter(sourceId) {
  return sourceAdapters.find((source) => source.id === sourceId) ?? null;
}

export function getAvailableNoticeSources() {
  return sourceAdapters
    .filter((source) => source.enabled)
    .map(({ id, name, supportsDetailExtraction }) => ({
      id,
      name,
      supportsDetailExtraction: Boolean(supportsDetailExtraction),
    }));
}

export function createNoticeSourceRegistry(adapters = sourceAdapters) {
  return {
    getAvailableSources: () => adapters
      .filter((source) => source.enabled)
      .map(({ id, name, supportsDetailExtraction }) => ({
        id,
        name,
        supportsDetailExtraction: Boolean(supportsDetailExtraction),
      })),
    getSource: (sourceId) => adapters.find((source) => source.id === sourceId) ?? null,
  };
}
