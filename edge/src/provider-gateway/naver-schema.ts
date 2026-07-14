import type { NaverEndpoint } from "./canary-contract";
import { isPlainObject } from "../shared/http";

export interface NaverSchemaResult {
  itemCount: number | null;
  valid: boolean;
}

export function validateNaverResponse(
  endpoint: NaverEndpoint,
  value: unknown,
  requestedDisplay: number
): NaverSchemaResult {
  if (
    !isPlainObject(value) ||
    typeof value.lastBuildDate !== "string" ||
    !isNonNegativeInteger(value.total) ||
    !isPositiveInteger(value.start) ||
    !isNonNegativeInteger(value.display) ||
    !Array.isArray(value.items) ||
    value.items.length > requestedDisplay ||
    value.display > requestedDisplay
  ) {
    return { itemCount: null, valid: false };
  }

  const validItems = value.items.every((item) =>
    endpoint === "local" ? isValidLocalItem(item) : isValidBlogItem(item)
  );
  return {
    itemCount: validItems ? value.items.length : null,
    valid: validItems
  };
}

function isValidLocalItem(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    hasStringFields(value, [
      "title",
      "link",
      "category",
      "description",
      "address",
      "roadAddress",
      "mapx",
      "mapy"
    ])
  );
}

function isValidBlogItem(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    hasStringFields(value, [
      "title",
      "link",
      "description",
      "bloggername",
      "bloggerlink",
      "postdate"
    ])
  );
}

function hasStringFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}
