import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { hashPassword } from "../services/passwordService.js";
import { createAuthToken } from "../services/tokenService.js";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1";

let baseUrl = "";
let server;
let user;
const missionId = `integration-mission-${Date.now()}`;

before(
  async () => {
    if (!runIntegrationTests) {
      return;
    }

    server = createApp().listen(0);
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    user = await prisma.user.create({
      data: {
        email: `mission-progress-${uniqueSuffix}@example.test`,
        username: `mission_progress_${uniqueSuffix}`.replace(/[^a-zA-Z0-9_]/g, "_"),
        name: "Mission Progress Integration Test",
        passwordHash: await hashPassword("test-password"),
        emailVerified: true,
        verifiedAt: new Date(),
      },
    });
  },
  { timeout: 15000 }
);

after(
  async () => {
    if (!runIntegrationTests) {
      return;
    }

    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }

    await prisma.mission.delete({ where: { id: missionId } }).catch(() => {});
    await prisma.$disconnect().catch(() => {});

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  },
  { timeout: 15000 }
);

test(
  "mission progress API saves and reads checked checklist items",
  { skip: !runIntegrationTests },
  async () => {
    const token = createAuthToken(user);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const saveResponse = await fetch(`${baseUrl}/api/missions/${missionId}/progress`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        missionTitle: "Integration Mission",
        missionSummary: "HTTP route to DB progress test",
        checkedItems: ["문제 정의", "입력 폼"],
        checklistItems: ["문제 정의", "입력 폼"],
      }),
    });
    const saveData = await saveResponse.json();

    assert.equal(saveResponse.status, 200);
    assert.equal(saveData.ok, true);
    assert.equal(saveData.progress.missionId, missionId);
    assert.equal(saveData.progress.status, "completed");
    assert.deepEqual(saveData.progress.checkedItems, ["문제 정의", "입력 폼"]);

    const getResponse = await fetch(`${baseUrl}/api/missions/${missionId}/progress`, {
      headers,
    });
    const getData = await getResponse.json();

    assert.equal(getResponse.status, 200);
    assert.equal(getData.ok, true);
    assert.equal(getData.progress.missionId, missionId);
    assert.equal(getData.progress.status, "completed");
    assert.deepEqual(getData.progress.checkedItems, ["문제 정의", "입력 폼"]);
  }
);
