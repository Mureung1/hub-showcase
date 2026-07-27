import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLikeCounts, getLikedRecordIds } from "./likesService.js";

function createDatabase({ data = [], error = null, calls = [] } = {}) {
  const query = {
    from(table) {
      calls.push(["from", table]);
      return query;
    },
    select(columns) {
      calls.push(["select", columns]);
      return query;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return query;
    },
    in(column, values) {
      calls.push(["in", column, values]);
      return query;
    },
    then(resolve) {
      return Promise.resolve({ data, error }).then(resolve);
    },
  };
  return query;
}

describe("likesService", () => {
  it("maps aggregate counts without exposing like rows", async () => {
    const calls = [];
    const database = {
      rpc(name, parameters) {
        calls.push([name, parameters]);
        return Promise.resolve({
          data: [
            { record_id: 1, like_count: 3 },
            { record_id: 2, like_count: 0 },
          ],
          error: null,
        });
      },
    };

    const counts = await getLikeCounts(database, [1, 2]);

    assert.equal(counts.get("1"), 3);
    assert.equal(counts.get("2"), 0);
    assert.deepEqual(calls, [[
      "get_music_record_like_counts",
      { p_record_ids: [1, 2] },
    ]]);
  });

  it("does not request aggregate counts for an empty record list", async () => {
    const database = {
      rpc() {
        throw new Error("database should not be queried");
      },
    };

    assert.equal((await getLikeCounts(database, [])).size, 0);
  });

  it("surfaces an aggregate lookup failure", async () => {
    const database = {
      rpc() {
        return Promise.resolve({
          data: null,
          error: new Error("aggregate unavailable"),
        });
      },
    };

    await assert.rejects(
      () => getLikeCounts(database, [1]),
      /aggregate unavailable/,
    );
  });

  it("returns only the current user's liked record IDs", async () => {
    const calls = [];
    const database = createDatabase({
      data: [{ record_id: 2 }, { record_id: 5 }],
      calls,
    });

    const likedRecordIds = await getLikedRecordIds(database, "user-1", [2, 3, 5]);

    assert.deepEqual([...likedRecordIds], [2, 5]);
    assert.deepEqual(calls.find(([name]) => name === "eq"), ["eq", "user_id", "user-1"]);
    assert.deepEqual(calls.find(([name]) => name === "in"), ["in", "record_id", [2, 3, 5]]);
  });

  it("keeps like state separate for two users viewing the same records", async () => {
    function databaseForUser(likesByUser, calls) {
      let selectedUserId = "";
      const query = {
        from() {
          return query;
        },
        select() {
          return query;
        },
        eq(_column, value) {
          selectedUserId = value;
          calls.push(value);
          return query;
        },
        in() {
          return query;
        },
        then(resolve) {
          return Promise.resolve({
            data: likesByUser[selectedUserId] ?? [],
            error: null,
          }).then(resolve);
        },
      };
      return query;
    }

    const calls = [];
    const database = databaseForUser({
      "user-a": [{ record_id: 1 }],
      "user-b": [{ record_id: 2 }],
    }, calls);

    const userALikes = await getLikedRecordIds(database, "user-a", [1, 2]);
    const userBLikes = await getLikedRecordIds(database, "user-b", [1, 2]);

    assert.deepEqual([...userALikes], [1]);
    assert.deepEqual([...userBLikes], [2]);
    assert.deepEqual(calls, ["user-a", "user-b"]);
  });

  it("does not query likes when there are no records", async () => {
    const database = {
      from() {
        throw new Error("database should not be queried");
      },
    };

    assert.deepEqual([...(await getLikedRecordIds(database, "user-1", []))], []);
  });

  it("surfaces a likes lookup failure", async () => {
    const database = createDatabase({ error: new Error("database unavailable") });

    await assert.rejects(
      () => getLikedRecordIds(database, "user-1", [1]),
      /database unavailable/,
    );
  });
});
