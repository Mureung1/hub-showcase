const db = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    deadline TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    title TEXT NOT NULL,
    assignee_id INTEGER REFERENCES members(id),
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    member_id INTEGER REFERENCES members(id),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const { count: teamCount } = db.prepare('SELECT COUNT(*) AS count FROM teams').get();

if (teamCount === 0) {
  const insertTeam = db.prepare(
    'INSERT INTO teams (name, deadline, invite_code) VALUES (?, ?, ?)'
  );
  const insertMember = db.prepare(
    'INSERT INTO members (team_id, name) VALUES (?, ?)'
  );
  const insertTask = db.prepare(
    'INSERT INTO tasks (team_id, title, assignee_id, due_date, status) VALUES (?, ?, ?, ?, ?)'
  );

  const seed = db.transaction(() => {
    const teamId = insertTeam.run('테스트 팀플', '2026-08-15', 'TEST01').lastInsertRowid;

    const memberIds = ['김우현', '이유진', '박서준'].map(
      (name) => insertMember.run(teamId, name).lastInsertRowid
    );

    insertTask.run(teamId, '초기 테스트 태스크', memberIds[0], '2026-07-20', 'pending');
  });

  seed();
  console.log('시드 데이터 삽입 완료: 팀 1개, 멤버 3명, 태스크 1건');
} else {
  console.log('이미 데이터가 있어 시드 삽입을 건너뜁니다.');
}

console.log('DB 초기화 완료:', db.name);
