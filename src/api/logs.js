import client from "./client.js";

export async function fetchLogs() {
  const { data } = await client.get("/logs");
  return data.logs;
}
