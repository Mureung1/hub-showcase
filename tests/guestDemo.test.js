import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeGuestDemoNotice,
  createGuestDemoScan,
  guestDemoProfile,
  guestDemoSource,
} from "../src/data/guestDemo.js";

test("guest demo scan returns fixed, unique sample notices without a network request", () => {
  const scan = createGuestDemoScan(guestDemoSource);

  assert.equal(scan.targetUrl, guestDemoSource.targetUrl);
  assert.equal(scan.allLinks.length, 3);
  assert.equal(new Set(scan.allLinks.map((link) => link.url)).size, 3);
});

test("guest demo analysis keeps the standard result shape and rematches against the demo profile", () => {
  const [link] = createGuestDemoScan().allLinks;
  const result = analyzeGuestDemoNotice(link, guestDemoProfile);

  assert.equal(result.mode, "mock");
  assert.equal(result.opportunity.sourceUrl, link.url);
  assert.equal(result.opportunity.category, "contest");
  assert.ok(["eligible", "conditionally_eligible"].includes(result.match.status));
  assert.ok(Array.isArray(result.tasks));
});
