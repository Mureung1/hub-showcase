import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AiProvider } from "@decision-log/shared";

import { loadEnv } from "../../shared/config/env.js";
import type { AnswerPromptTemplate } from "./ports.js";

/**
 * 파일 기반 AnswerPromptTemplate (SPEC-AI-001 10장).
 * `<ANSWER_PROMPTS_DIR>/answer/<provider>/<version>.md`를 런타임에 읽어 변수를 채운다.
 *
 * 코드가 아니라 텍스트로 두는 이유: 프롬프트를 갈아끼울 때 재빌드가 필요 없고,
 * 워크스페이스 밖 소스를 import 하지 않아 tsc rootDir·dist 경로 문제가 생기지 않는다.
 * 읽은 내용은 프로세스 수명 동안 캐시한다(파일 교체는 재기동으로 반영).
 */

const cache = new Map<string, string>();

const CONTEXT_PLACEHOLDER = "(이전 결정 없음)";

function fill(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    key in variables ? (variables[key] ?? "") : whole,
  );
}

export function createFilePromptTemplate(): AnswerPromptTemplate {
  const env = loadEnv();
  const version = env.ANSWER_PROMPT_VERSION;

  return {
    version,
    async render(provider: AiProvider, variables): Promise<string> {
      const file = path.join(
        env.ANSWER_PROMPTS_DIR,
        "answer",
        provider,
        `${version}.md`,
      );

      let template = cache.get(file);
      if (template === undefined) {
        try {
          template = await readFile(file, "utf8");
        } catch {
          // 경로만 알린다(파일 내용·비밀값은 담지 않는다).
          throw new Error(`답변 프롬프트 템플릿을 읽지 못했습니다: ${file}`);
        }
        cache.set(file, template);
      }

      return fill(template, {
        question: variables.question,
        context: variables.context ?? CONTEXT_PLACEHOLDER,
      });
    },
  };
}
