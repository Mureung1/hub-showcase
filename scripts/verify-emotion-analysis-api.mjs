import { randomUUID } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const requestedPort = Number.parseInt(
  process.env.PORT ?? process.env.SERVER_PORT ?? "",
  10
);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3000;
const apiBaseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${port}`;
const endpoint = `${apiBaseUrl}/api/emotion-analyses`;

async function readJson(response) {
  const payload = await response.json();
  return { response, payload };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyApi() {
  const invalidResult = await readJson(
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    })
  );

  assert(invalidResult.response.status === 400, "Invalid POST must return HTTP 400.");
  assert(
    invalidResult.payload.error?.code === "VALIDATION_ERROR",
    "Invalid POST must return VALIDATION_ERROR."
  );

  const sessionId = randomUUID();
  const createResult = await readJson(
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        situationText: "Task 4 API verification record",
        faceSignal: "neutral",
        voiceSignal: "normal",
        selectedScenario: "normal",
        analysisResult: {
          scores: [{ key: "neutral", label: "Neutral", score: 100 }],
          possibleStates: [],
          evidence: ["Created by the Task 4 API verification script"],
          responseApproach: "continue_normally",
          needsConfirmation: false
        },
        aiResponse: "Task 4 API verification response"
      })
    })
  );

  assert(createResult.response.status === 201, "Valid POST must return HTTP 201.");
  const created = createResult.payload.data?.emotionAnalysis;
  assert(created?.id, "Valid POST must return the created record ID.");
  assert(created.sessionId === sessionId, "Created record must preserve sessionId.");

  const listResult = await readJson(
    await fetch(`${endpoint}?sessionId=${sessionId}&limit=10`)
  );

  assert(listResult.response.status === 200, "Valid GET must return HTTP 200.");
  const records = listResult.payload.data?.emotionAnalyses;
  assert(Array.isArray(records), "Valid GET must return an emotionAnalyses array.");
  assert(
    records.some((record) => record.id === created.id),
    "Valid GET must include the record created by POST."
  );

  console.log("PASS validation: invalid POST returned HTTP 400");
  console.log(`PASS create: POST stored record ${created.id}`);
  console.log(`PASS list: GET returned ${records.length} record(s) for the test session`);
}

try {
  await verifyApi();
} catch (error) {
  console.error(error instanceof Error ? error.message : "An unknown error occurred.");
  process.exitCode = 1;
}
