import { Client } from "@notionhq/client";

// 토큰이 없을 때 API route가 500 대신 온보딩 안내로 처리할 수 있도록 구분되는 에러 타입.
export class NotionConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotionConfigError";
  }
}

let client;
const dataSourceIdCache = new Map();

export function getNotionClient() {
  if (!process.env.NOTION_TOKEN) {
    throw new NotionConfigError(
      "Notion 연동이 아직 설정되지 않았어요. .env.local에 NOTION_TOKEN을 넣어주세요."
    );
  }
  if (!client) {
    client = new Client({ auth: process.env.NOTION_TOKEN });
  }
  return client;
}

// Notion API가 database 대신 하위 data source 단위로 조회하도록 바뀌어서
// (database 하나가 여러 data source를 가질 수 있음) database_id로 먼저 data_source_id를 찾는다.
async function getDefaultDataSourceId(notion, databaseId) {
  if (dataSourceIdCache.has(databaseId)) {
    return dataSourceIdCache.get(databaseId);
  }
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = db.data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error("이 데이터베이스에서 data source를 찾을 수 없어요.");
  }
  dataSourceIdCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

export async function queryDatabase(databaseId, { filter, sorts } = {}) {
  if (!databaseId) {
    throw new NotionConfigError(
      "Notion 데이터베이스 ID가 설정되지 않았어요. .env.local을 확인해주세요."
    );
  }
  const notion = getNotionClient();
  const dataSourceId = await getDefaultDataSourceId(notion, databaseId);
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    ...(filter ? { filter } : {}),
    ...(sorts ? { sorts } : {}),
  });
  return response.results;
}

export async function createPage(databaseId, properties) {
  if (!databaseId) {
    throw new NotionConfigError(
      "Notion 데이터베이스 ID가 설정되지 않았어요. .env.local을 확인해주세요."
    );
  }
  const notion = getNotionClient();
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

export async function archivePage(pageId) {
  const notion = getNotionClient();
  return notion.pages.update({ page_id: pageId, archived: true });
}

export async function updatePage(pageId, properties) {
  const notion = getNotionClient();
  return notion.pages.update({ page_id: pageId, properties });
}

export async function getPage(pageId) {
  const notion = getNotionClient();
  return notion.pages.retrieve({ page_id: pageId });
}
