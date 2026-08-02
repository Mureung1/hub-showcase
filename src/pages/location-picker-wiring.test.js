import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readSource(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("GroupBuyEditor wires the shared picker into pickup fields and hydration", async () => {
  const source = await readSource("../components/GroupBuyEditor.jsx");

  assert.match(source, /import LocationPicker from "\.\/LocationPicker";/);
  assert.match(source, /pickupLatitude:\s*values\.pickupLatitude\s*\?\?\s*null/);
  assert.match(source, /pickupLongitude:\s*values\.pickupLongitude\s*\?\?\s*null/);
  assert.match(source, /pickupAddressLength < 2 \|\| pickupAddressLength > 80/);
  assert.match(source, /<LocationPicker[\s\S]*address=\{form\.pickupLocation\}[\s\S]*latitude=\{form\.pickupLatitude\}[\s\S]*longitude=\{form\.pickupLongitude\}[\s\S]*pickupLatitude:\s*location\.latitude/);
  assert.match(source, /pickupLongitude:\s*location\.longitude/);
});

test("GroupBuyDetailPage wires the shared picker into join payload fields", async () => {
  const source = await readSource("./GroupBuyDetailPage.jsx");

  assert.match(source, /import LocationPicker from "\.\.\/components\/LocationPicker";/);
  assert.match(source, /joinLocation\.address/);
  assert.match(source, /latitude:\s*joinLocation\.latitude/);
  assert.match(source, /longitude:\s*joinLocation\.longitude/);
  assert.match(source, /startLocation:\s*joinLocation\.address/);
  assert.match(source, /<LocationPicker[\s\S]*address=\{joinLocation\.address\}[\s\S]*latitude=\{joinLocation\.latitude\}[\s\S]*longitude=\{joinLocation\.longitude\}[\s\S]*onChange=\{setJoinLocation\}/);
});

test("LocationPicker accepts 2-character addresses and clears stale coordinates on text entry", async () => {
  const source = await readSource("../components/LocationPicker.jsx");

  assert.match(source, /minLength="2"/);
  assert.match(source, /onChange\(createLocationSelection\(event\.target\.value,\s*null,\s*null\)\);/);
});
