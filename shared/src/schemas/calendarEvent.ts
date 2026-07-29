import { z } from "zod";

// Calendar Event Type
export const CalendarEventTypeSchema = z.enum([
  "EXAM",           // 시험
  "PART_TIME",      // 아르바이트
  "OTHER",          // 기타
]);

export type CalendarEventType = z.infer<typeof CalendarEventTypeSchema>;

// Calendar Event Source (수동 등록 vs 스크랩 자동 동기화)
export const CalendarEventSourceSchema = z.enum(["manual", "scrap-sync"]);
export type CalendarEventSource = z.infer<typeof CalendarEventSourceSchema>;

// iCalendar 표준 필드 기반 Base 스키마
const BaseCalendarEventSchema = z.object({
  id: z.string().uuid().optional(),
  uid: z.string().optional(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: CalendarEventTypeSchema,
  dtstart: z.coerce.date(),
  dtend: z.coerce.date(),
  isAllDay: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  memo: z.string().optional(),
  hideFromRecommendation: z.boolean().default(false),
  relatedPostingId: z.string().uuid().nullable().optional(),
  source: CalendarEventSourceSchema.default("manual"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const CalendarEventSchema = BaseCalendarEventSchema.refine(
  (data) => data.dtstart < data.dtend,
  { message: "종료 시간이 시작 시간보다 나중이어야 합니다", path: ["dtend"] }
);

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// 생성 요청 스키마
export const CreateCalendarEventSchema = BaseCalendarEventSchema.pick({
  title: true,
  type: true,
  dtstart: true,
  dtend: true,
  isAllDay: true,
  startTime: true,
  endTime: true,
  memo: true,
  hideFromRecommendation: true,
  relatedPostingId: true,
}).extend({
  source: CalendarEventSourceSchema.default("manual"),
});

export type CreateCalendarEventRequest = z.infer<typeof CreateCalendarEventSchema>;

// 업데이트 요청 스키마
export const UpdateCalendarEventSchema = CreateCalendarEventSchema.partial();
export type UpdateCalendarEventRequest = z.infer<typeof UpdateCalendarEventSchema>;