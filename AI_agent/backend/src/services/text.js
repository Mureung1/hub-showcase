export const normalizeText = (value) =>
  String(value || "").toLowerCase().replace(/\s+/g, "");

export const normalizeList = (content) => {
  if (!content) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
};
