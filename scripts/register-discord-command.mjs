// Discord 슬래시 커맨드(`/알림`) 등록 스크립트.
// DISCORD_GUILD_ID가 있으면 길드 커맨드(즉시 반영), 없으면 글로벌 커맨드(전파에 최대 1시간)로 등록한다.
//
// 사용법:
//   node scripts/register-discord-command.mjs
//
// 환경변수 (우선순위: process.env > 프로젝트 루트 .env 파일):
//   DISCORD_BOT_TOKEN
//   DISCORD_APPLICATION_ID
//   DISCORD_GUILD_ID (선택 — 지정 시 해당 길드에만 즉시 반영되는 커맨드로 등록)

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// research.md §9.4 원본 커맨드 정의 그대로.
const COMMAND_DEFINITION = {
  name: "알림",
  description: "자연어로 주식 알림 조건을 설정합니다.",
  type: 1,
  options: [
    {
      type: 3,
      name: "내용",
      description: "예: 삼성전자가 8만원 이상이면 알려줘",
      required: true,
    },
  ],
};

/**
 * .env 파일을 최소한으로 파싱한다 (dotenv 의존성 없이).
 * `KEY=VALUE` 형태만 지원, 따옴표 제거, 주석(#)/빈 줄 무시.
 * (scripts/seed-symbols.mjs와 동일한 방식)
 */
async function loadDotEnvFallback() {
  const envPath = path.join(projectRoot, ".env");
  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    return {};
  }

  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function resolveEnv() {
  const dotEnv = await loadDotEnvFallback();
  const botToken = process.env.DISCORD_BOT_TOKEN ?? dotEnv.DISCORD_BOT_TOKEN;
  const applicationId =
    process.env.DISCORD_APPLICATION_ID ?? dotEnv.DISCORD_APPLICATION_ID;
  const guildId = process.env.DISCORD_GUILD_ID ?? dotEnv.DISCORD_GUILD_ID;

  if (!botToken || !applicationId) {
    console.error(
      "[register-discord-command] DISCORD_BOT_TOKEN / DISCORD_APPLICATION_ID가 필요합니다. " +
        "환경변수로 설정하거나 프로젝트 루트 .env 파일에 정의하세요."
    );
    process.exit(1);
  }

  return { botToken, applicationId, guildId: guildId || null };
}

async function registerCommand() {
  const { botToken, applicationId, guildId } = await resolveEnv();

  const url = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;

  console.log(
    `[register-discord-command] ${
      guildId ? `길드(${guildId}) 커맨드` : "글로벌 커맨드"
    }로 등록합니다...`
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bot ${botToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(COMMAND_DEFINITION),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.error(`[register-discord-command] 등록 실패 (${res.status}):`, body);
    process.exit(1);
  }

  console.log(`[register-discord-command] 등록 완료. command id: ${body?.id}`);
  if (!guildId) {
    console.log(
      "[register-discord-command] 글로벌 커맨드는 전파에 최대 1시간 걸릴 수 있습니다."
    );
  }
}

registerCommand().catch((error) => {
  console.error("[register-discord-command] 예기치 않은 오류:", error);
  process.exit(1);
});
