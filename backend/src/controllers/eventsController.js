import database from "../config/database.js";

export async function saveEventsHandler(req, res) {
  try {
    const { events } = req.body;
    const userId = req.user.userId;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "저장할 일정이 없습니다.",
      });
    }

    // 각 일정을 데이터베이스에 저장
    const savedEvents = [];
    for (const event of events) {
      // 필수값 검증
      if (!event.name) {
        return res.status(400).json({
          success: false,
          message: "일정명은 필수입니다.",
        });
      }

      try {
        // 일정 저장 (notice_id는 NULL로, 이후에 분석과 연결)
        const stmt = database.prepare(`
          INSERT INTO events (
            user_id,
            name,
            start_date,
            end_date,
            deadline,
            time_start,
            time_end,
            location,
            deliverables,
            notes,
            is_selected
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
          userId,
          event.name,
          event.startDate || null,
          event.endDate || null,
          event.deadline || null,
          event.time?.start || null,
          event.time?.end || null,
          event.location || null,
          event.deliverables?.length > 0 ? JSON.stringify(event.deliverables) : null,
          event.notes || null,
          1
        );

        savedEvents.push({
          id: result.lastInsertRowid,
          ...event,
        });
      } catch (error) {
        console.error("일정 저장 오류:", error.message);
        return res.status(500).json({
          success: false,
          message: "일정 저장 중 오류가 발생했습니다.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${savedEvents.length}개의 일정이 저장되었습니다.`,
      data: savedEvents,
    });
  } catch (error) {
    console.error("API 오류:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "서버 오류가 발생했습니다.",
    });
  }
}

export async function getEventsHandler(req, res) {
  try {
    const userId = req.user.userId;

    const stmt = database.prepare(`
      SELECT
        id,
        name,
        start_date as startDate,
        end_date as endDate,
        deadline,
        time_start,
        time_end,
        location,
        deliverables,
        notes,
        is_selected as isSelected,
        created_at as createdAt
      FROM events
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    const events = stmt.all(userId);

    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      deadline: event.deadline,
      time: {
        start: event.time_start,
        end: event.time_end,
      },
      location: event.location,
      deliverables: event.deliverables ? JSON.parse(event.deliverables) : [],
      notes: event.notes,
      isSelected: event.isSelected,
      createdAt: event.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: `${formattedEvents.length}개의 일정을 조회했습니다.`,
      data: formattedEvents,
    });
  } catch (error) {
    console.error("일정 조회 오류:", error.message);
    return res.status(500).json({
      success: false,
      message: "일정 조회 중 오류가 발생했습니다.",
    });
  }
}

export async function checkDuplicateHandler(req, res) {
  try {
    const { events } = req.body;
    const userId = req.user.userId;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: "검사할 일정이 없습니다.",
      });
    }

    const duplicates = [];

    for (const event of events) {
      if (!event.name || !event.startDate) {
        continue;
      }

      const stmt = database.prepare(`
        SELECT id, name, start_date as startDate
        FROM events
        WHERE user_id = ? AND name = ? AND start_date = ?
        LIMIT 1
      `);

      const duplicate = stmt.get(userId, event.name, event.startDate);

      if (duplicate) {
        duplicates.push({
          name: event.name,
          startDate: event.startDate,
          existingId: duplicate.id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      message: duplicates.length > 0
        ? `${duplicates.length}개의 중복된 일정이 발견되었습니다.`
        : "중복된 일정이 없습니다.",
      data: duplicates,
    });
  } catch (error) {
    console.error("중복 검사 오류:", error.message);
    return res.status(500).json({
      success: false,
      message: "중복 검사 중 오류가 발생했습니다.",
    });
  }
}
