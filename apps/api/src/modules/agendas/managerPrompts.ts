import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnv } from "../../shared/config/env.js";

/**
 * 파일 기반 Manager 프롬프트 로더 (SPEC-AI-002 §15.1).
 * `<MANAGER_PROMPTS_DIR>/<kind>/<version>.md`를 런타임에 읽어 변수를 채운다.
 * SPEC-AI-001 `promptTemplate.ts`와 같은 패턴 — 텍스트로 두어 재빌드 없이 교체하고,
 * 워크스페이스 밖 소스를 import 하지 않는다. 읽은 내용은 프로세스 수명 동안 캐시한다.
 */

const cache = new Map<string, string>();

export type ManagerPromptKind =
  | "classify"
  | "leftover"
  | "compare"
  | "recheck"
  // SPEC-AI-003 — FinalAnswer 종합. finalNote 는 §5.2 의 요약만 재요청하는 경로다.
  | "final"
  | "finalNote";

function fill(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    key in variables ? (variables[key] ?? "") : whole,
  );
}

export async function renderManagerPrompt(
  kind: ManagerPromptKind,
  version: string,
  variables: Record<string, string>,
): Promise<string> {
  const env = loadEnv();
  const file = path.join(env.MANAGER_PROMPTS_DIR, kind, `${version}.md`);

  let template = cache.get(file);
  if (template === undefined) {
    try {
      template = await readFile(file, "utf8");
    } catch {
      // 경로만 알린다(파일 내용·비밀값은 담지 않는다).
      throw new Error(`Manager 프롬프트 템플릿을 읽지 못했습니다: ${file}`);
    }
    cache.set(file, template);
  }

  return fill(template, variables);
}
