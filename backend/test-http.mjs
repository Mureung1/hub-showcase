import http from "http";
import Database from "better-sqlite3";
import { spawn } from "child_process";

const API = "http://localhost:3000";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
      headers: { "Content-Type": "application/json" }
    };
    if (token) opts.headers.Authorization = `Bearer $${token}`;

    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  const server = spawn("node", ["src/server.js"], { stdio: "pipe" });
  await new Promise(r => setTimeout(r, 4000));

  const email = `test$${Date.now()}@test.com`;
  let token, eventId;

  try {
    const reg = await request("POST", "/auth/register", { email, password: "testpass123", name: "Test" });
    console.log(`POST: $${reg.success}`);

    const login = await request("POST", "/auth/login", { email, password: "testpass123" });
    token = login.data.token;
    console.log(`로그인: $${login.success}`);

    const create = await request("POST", "/api/events", [{ name: "Test", startDate: "2026-08-01", deadline: "2026-08-10" }], token);
    eventId = create.data[0].id;
    console.log(`생성: $${create.success}`);

    const patch = await request("PATCH", `/api/events/$${eventId}`, { name: "Updated", startDate: "2026-08-02" }, token);
    console.log(`PATCH: $${patch.success}`);

    const get1 = await request("GET", "/api/events", null, token);
    const updated = get1.data.find(e => e.id === eventId);
    console.log(`수정 후 GET: name=$${updated.name}`);

    const del = await request("DELETE", `/api/events/$${eventId}`, null, token);
    console.log(`DELETE: $${del.success}`);

    const get2 = await request("GET", "/api/events", null, token);
    const deleted = get2.data.find(e => e.id === eventId);
    console.log(`삭제 후 GET: $${deleted ? "found" : "not found"}`);

  } catch (err) {
    console.error("오류:", err.message);
  } finally {
    server.kill();
    const db = new Database("data/calme.db");
    db.prepare("DELETE FROM users WHERE email = ?").run(email);
    db.close();
  }
}

test();
