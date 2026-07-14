import database from "../config/database.js";

// 공지 등록 함수
export function createNotice(req, res) {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "제목과 본문을 모두 입력해주세요.",
    });
  }

  const insertNotice = database.prepare(`
    INSERT INTO notices (title, content)
    VALUES (?, ?)
  `);

  const result = insertNotice.run(title, content);

  const savedNotice = database
    .prepare(`
      SELECT
        id,
        title,
        content,
        created_at AS createdAt
      FROM notices
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  return res.status(201).json({
    success: true,
    message: "공지 저장 성공",
    data: savedNotice,
  });
}

// 공지 조회 함수
export function getNotices(req, res) {
  const notices = database
    .prepare(`
      SELECT
        id,
        title,
        content,
        created_at AS createdAt
      FROM notices
      ORDER BY id DESC
    `)
    .all();

  return res.json({
    success: true,
    data: notices,
  });
}