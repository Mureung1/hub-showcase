import { apiUrl } from "./api";

export type IndustryTaxonomyNode = {
  id: string;
  parent_path_key: string | null;
  path_key: string;
  level: number;
  code: string;
  name: string;
  is_leaf: boolean;
  capability: "FULL" | "PARTIAL" | "NONE";
  storefront_profile: string;
};

export type IndustryTaxonomy = { assignment_run_id: string; nodes: IndustryTaxonomyNode[] };

export async function loadIndustryTaxonomy(signal: AbortSignal): Promise<IndustryTaxonomy> {
  const response = await fetch(apiUrl("/api/v1/industry-taxonomy"), { signal });
  if (!response.ok) throw new Error(`Industry taxonomy API ${response.status}`);
  return (await response.json()) as IndustryTaxonomy;
}
