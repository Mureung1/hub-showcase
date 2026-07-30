function parseDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

function toTodayKey(now) {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getTaskGroup(task, todayKey) {
  if (task?.status === "done") return 3;

  const dueDate = parseDateKey(task?.dueDate);
  if (!dueDate) return 2;
  return dueDate >= todayKey ? 0 : 1;
}

export function sortTasksByUpcomingDate(tasks = [], now = new Date()) {
  const todayKey = toTodayKey(now);

  return [...tasks]
    .map((task, index) => ({
      dueDate: parseDateKey(task?.dueDate),
      group: getTaskGroup(task, todayKey),
      index,
      task,
    }))
    .sort((left, right) => {
      if (left.group !== right.group) return left.group - right.group;

      if (left.group === 0) return left.dueDate.localeCompare(right.dueDate);
      if (left.group === 1) return right.dueDate.localeCompare(left.dueDate);

      if (left.group === 3 && left.dueDate && right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }

      return left.index - right.index;
    })
    .map(({ task }) => task);
}