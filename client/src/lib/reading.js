export function getRecords(book) {
  return book.readingRecords ?? book.records ?? [];
}

export function getLatestRecord(book) {
  if (book.latestRecord) {
    return book.latestRecord;
  }

  return [...getRecords(book)].sort((left, right) => {
    const createdAtDifference = new Date(right.createdAt) - new Date(left.createdAt);
    return createdAtDifference || right.id - left.id;
  })[0] ?? null;
}

export function getNextStartPage(book) {
  return (getLatestRecord(book)?.endPage ?? book.initialPage - 1) + 1;
}

export function getContinueBook(books) {
  return [...books].sort((left, right) => {
    const leftLatestRecord = getLatestRecord(left);
    const rightLatestRecord = getLatestRecord(right);

    if (leftLatestRecord && rightLatestRecord) {
      const createdAtDifference = new Date(rightLatestRecord.createdAt) - new Date(leftLatestRecord.createdAt);
      return createdAtDifference || rightLatestRecord.id - leftLatestRecord.id;
    }

    if (rightLatestRecord) return 1;
    if (leftLatestRecord) return -1;

    return new Date(right.createdAt ?? 0) - new Date(left.createdAt ?? 0);
  })[0] ?? null;
}

export function formatRecordDate(createdAt) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date(createdAt));
}
