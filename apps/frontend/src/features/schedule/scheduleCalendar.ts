import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { Schedule } from "./scheduleTypes";

export type MonthlyScheduleSummary = {
  currentMonthSchedules: Schedule[];
  myMonthSchedules: Schedule[];
  myMonthHours: number;
  activeWorkDays: number;
};

export function parseMonthParam(monthParam: string | null, fallbackDate = new Date()) {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return startOfMonth(fallbackDate);
  }

  const [yearText, monthText] = monthParam.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const date = new Date(year, monthIndex, 1);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex) {
    return startOfMonth(fallbackDate);
  }

  return startOfMonth(date);
}

export function getCalendarDateRange(currentMonth: Date) {
  const calendarStart = startOfWeek(startOfMonth(currentMonth));
  const calendarEnd = endOfWeek(endOfMonth(currentMonth));

  return {
    calendarStart,
    calendarEnd,
    fromDate: format(calendarStart, "yyyy-MM-dd"),
    toDate: format(calendarEnd, "yyyy-MM-dd"),
    calendarDays: eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  };
}

export function getScheduleDuration(schedule: Pick<Schedule, "startTime" | "endTime">) {
  const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
  const [endHour, endMinute] = schedule.endTime.split(":").map(Number);

  if (
    startHour === undefined ||
    startMinute === undefined ||
    endHour === undefined ||
    endMinute === undefined ||
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    Number.isNaN(endHour) ||
    Number.isNaN(endMinute)
  ) {
    return 0;
  }

  return Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
}

export function getHoursLabel(hours: number) {
  if (hours === 0) {
    return "0시간";
  }

  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}시간`;
}

export function groupSchedulesByDate(schedules: Schedule[]) {
  return schedules.reduce<Map<string, Schedule[]>>((map, schedule) => {
    const daySchedules = map.get(schedule.workDate) ?? [];

    daySchedules.push(schedule);
    map.set(schedule.workDate, daySchedules);

    return map;
  }, new Map<string, Schedule[]>());
}

export function getCurrentMonthSchedules(schedules: Schedule[], currentMonth: Date) {
  const monthKey = format(currentMonth, "yyyy-MM");

  return schedules.filter((schedule) => schedule.workDate.startsWith(monthKey));
}

export function getMonthlyScheduleSummary(
  schedules: Schedule[],
  currentMonth: Date,
  currentUserId: string | undefined
): MonthlyScheduleSummary {
  const currentMonthSchedules = getCurrentMonthSchedules(schedules, currentMonth);
  const myMonthSchedules = currentUserId
    ? currentMonthSchedules.filter((schedule) => schedule.workerId === currentUserId)
    : [];
  const myMonthHours = myMonthSchedules.reduce((total, schedule) => total + getScheduleDuration(schedule), 0);
  const activeWorkDays = new Set(currentMonthSchedules.map((schedule) => schedule.workDate)).size;

  return {
    currentMonthSchedules,
    myMonthSchedules,
    myMonthHours,
    activeWorkDays
  };
}

export function getDayLabel(daySchedules: Schedule[], currentUserId: string | undefined) {
  if (daySchedules.length === 0) {
    return null;
  }

  if (currentUserId && daySchedules.some((schedule) => schedule.workerId === currentUserId)) {
    return "내 근무";
  }

  const workerCount = new Set(daySchedules.map((schedule) => schedule.workerId)).size;

  return `${workerCount}명 근무`;
}

export function getDayTone(
  daySchedules: Schedule[],
  currentUserId: string | undefined,
  inCurrentMonth: boolean,
  date: Date
) {
  const tones = ["day"];

  if (!inCurrentMonth) {
    tones.push("muted");
  }

  if (daySchedules.length > 0) {
    tones.push(currentUserId && daySchedules.some((schedule) => schedule.workerId === currentUserId) ? "shift" : "store");
  }

  if (isToday(date)) {
    tones.push("today");
  }

  return tones.join(" ");
}

export function sortMonthlySchedules(schedules: Schedule[]) {
  return [...schedules].sort((first, second) => {
    const dateCompare = first.workDate.localeCompare(second.workDate);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return first.startTime.localeCompare(second.startTime);
  });
}

export function getUpcomingSchedules(schedules: Schedule[], now = new Date()) {
  return sortMonthlySchedules(
    schedules.filter((schedule) => {
      const scheduleEndDate = new Date(`${schedule.workDate}T${schedule.endTime}`);

      return scheduleEndDate > now;
    })
  );
}
