const db = require('../db');

const upsertStmt = db.prepare(`
  INSERT INTO vocab (term, meaning_kr, example_en, seen_count, first_seen_at, last_seen_at)
  VALUES (@term, @meaningKr, @example, 1, datetime('now'), datetime('now'))
  ON CONFLICT(term) DO UPDATE SET
    seen_count = seen_count + 1,
    last_seen_at = datetime('now')
`);

function recordTermsSeen(matchedTerms) {
  const tx = db.transaction((terms) => {
    for (const term of terms) {
      upsertStmt.run({ term: term.term, meaningKr: term.meaningKr, example: term.example });
    }
  });
  tx(matchedTerms);
}

function listVocab() {
  return db
    .prepare('SELECT * FROM vocab ORDER BY last_seen_at DESC')
    .all();
}

function recordReview(vocabId, correct) {
  db.prepare('INSERT INTO vocab_reviews (vocab_id, correct) VALUES (?, ?)').run(
    vocabId,
    correct ? 1 : 0
  );
}

module.exports = { recordTermsSeen, listVocab, recordReview };
