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
        const result = await database.query(
          `
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
              category,
              is_selected
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `,
          [
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
            event.category || "기타",
            true,
          ]
        );

        savedEvents.push({
          id: result.rows[0].id,
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

    const result = await database.query(
      `
        SELECT
          id,
          name,
          start_date as "startDate",
          end_date as "endDate",
          deadline,
          time_start,
          time_end,
          location,
          deliverables,
          notes,
          category,
          is_selected as "isSelected",
          created_at as "createdAt"
        FROM events
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    );

    const formattedEvents = result.rows.map(event => ({
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
      category: event.category || "기타",
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

      const result = await database.query(
        `
          SELECT id, name, start_date as "startDate"
          FROM events
          WHERE user_id = $1 AND name = $2 AND start_date = $3
          LIMIT 1
        `,
        [userId, event.name, event.startDate]
      );

      const duplicate = result.rows[0];

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

function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function isValidTimeFormat(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  return /^\d{2}:\d{2}$/.test(timeStr);
}

export async function updateEventHandler(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, startDate, endDate, deadline, time, location, deliverables, notes } = req.body;

    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 일정 ID입니다.",
      });
    }

    // 기존 일정 조회
    const getResult = await database.query(
      "SELECT * FROM events WHERE id = $1 AND user_id = $2",
      [eventId, userId]
    );
    const existingEvent = getResult.rows[0];

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "요청한 일정을 찾을 수 없습니다.",
      });
    }

    const trimmedName = name ? name.trim() : null;
    if (trimmedName === "") {
      return res.status(400).json({
        success: false,
        message: "일정명은 공백만으로 구성될 수 없습니다.",
      });
    }

    const finalName = trimmedName || existingEvent.name;

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: "일정명은 필수입니다.",
      });
    }

    const finalStartDate = startDate || existingEvent.start_date;
    const finalEndDate = endDate || existingEvent.end_date;
    const finalDeadline = deadline || existingEvent.deadline;

    if (!finalStartDate && !finalEndDate && !finalDeadline) {
      return res.status(400).json({
        success: false,
        message: "시작일, 종료일, 마감일 중 최소 하나는 필수입니다.",
      });
    }

    if (startDate && !isValidDateFormat(startDate)) {
      return res.status(400).json({
        success: false,
        message: "시작일 형식은 YYYY-MM-DD여야 합니다.",
      });
    }

    if (endDate && !isValidDateFormat(endDate)) {
      return res.status(400).json({
        success: false,
        message: "종료일 형식은 YYYY-MM-DD여야 합니다.",
      });
    }

    if (deadline && !isValidDateFormat(deadline)) {
      return res.status(400).json({
        success: false,
        message: "마감일 형식은 YYYY-MM-DD여야 합니다.",
      });
    }

    if (finalStartDate && finalEndDate && finalEndDate < finalStartDate) {
      return res.status(400).json({
        success: false,
        message: "종료일은 시작일보다 이전일 수 없습니다.",
      });
    }

    const finalTimeStart = time?.start || existingEvent.time_start;
    const finalTimeEnd = time?.end || existingEvent.time_end;

    if (time?.start && !isValidTimeFormat(time.start)) {
      return res.status(400).json({
        success: false,
        message: "시작 시간 형식은 HH:MM이어야 합니다.",
      });
    }

    if (time?.end && !isValidTimeFormat(time.end)) {
      return res.status(400).json({
        success: false,
        message: "종료 시간 형식은 HH:MM이어야 합니다.",
      });
    }

    const finalLocation = location !== undefined ? location : existingEvent.location;

    let finalDeliverables = existingEvent.deliverables;
    if (deliverables !== undefined) {
      if (!Array.isArray(deliverables)) {
        return res.status(400).json({
          success: false,
          message: "deliverables는 배열이어야 합니다.",
        });
      }
      finalDeliverables = deliverables.length > 0 ? JSON.stringify(deliverables) : null;
    }

    const finalNotes = notes !== undefined ? notes : existingEvent.notes;

    // 일정 수정
    const updateResult = await database.query(
      `
        UPDATE events
        SET name = $1,
            start_date = $2,
            end_date = $3,
            deadline = $4,
            time_start = $5,
            time_end = $6,
            location = $7,
            deliverables = $8,
            notes = $9
        WHERE id = $10 AND user_id = $11
        RETURNING
          id,
          name,
          start_date as "startDate",
          end_date as "endDate",
          deadline,
          time_start,
          time_end,
          location,
          deliverables,
          notes,
          is_selected as "isSelected",
          created_at as "createdAt"
      `,
      [
        finalName,
        finalStartDate,
        finalEndDate,
        finalDeadline,
        finalTimeStart,
        finalTimeEnd,
        finalLocation,
        finalDeliverables,
        finalNotes,
        eventId,
        userId,
      ]
    );

    const updatedEvent = updateResult.rows[0];

    const formattedEvent = {
      id: updatedEvent.id,
      name: updatedEvent.name,
      startDate: updatedEvent.startDate,
      endDate: updatedEvent.endDate,
      deadline: updatedEvent.deadline,
      time: {
        start: updatedEvent.time_start,
        end: updatedEvent.time_end,
      },
      location: updatedEvent.location,
      deliverables: updatedEvent.deliverables ? JSON.parse(updatedEvent.deliverables) : [],
      notes: updatedEvent.notes,
      isSelected: updatedEvent.isSelected,
      createdAt: updatedEvent.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "일정이 수정되었습니다.",
      data: formattedEvent,
    });
  } catch (error) {
    console.error("일정 수정 오류:", error.message);
    return res.status(500).json({
      success: false,
      message: "일정 수정 중 오류가 발생했습니다.",
    });
  }
}

export async function deleteEventHandler(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 일정 ID입니다.",
      });
    }

    // 기존 일정 확인
    const checkResult = await database.query(
      "SELECT id FROM events WHERE id = $1 AND user_id = $2",
      [eventId, userId]
    );
    const existingEvent = checkResult.rows[0];

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "요청한 일정을 찾을 수 없습니다.",
      });
    }

    // 일정 삭제
    await database.query(
      "DELETE FROM events WHERE id = $1 AND user_id = $2",
      [eventId, userId]
    );

    return res.status(200).json({
      success: true,
      message: "일정이 삭제되었습니다.",
      data: { id: eventId },
    });
  } catch (error) {
    console.error("일정 삭제 오류:", error.message);
    return res.status(500).json({
      success: false,
      message: "일정 삭제 중 오류가 발생했습니다.",
    });
  }
}
