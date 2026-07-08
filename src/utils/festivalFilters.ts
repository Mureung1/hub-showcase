import type { Booth, ScheduleItem } from '../types/festival'

export function filterSchedules(
  schedules: ScheduleItem[],
  selectedDate: string,
  selectedCategory: string,
) {
  return schedules.filter(
    (item) =>
      item.date === selectedDate &&
      (selectedCategory === '전체' || item.category === selectedCategory),
  )
}

export function filterBooths(
  booths: Booth[],
  selectedDate: string,
  selectedCategory: string,
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return booths.filter((booth) => {
    const matchesDate = booth.date === selectedDate
    const matchesCategory =
      selectedCategory === '전체' || booth.category === selectedCategory
    const matchesQuery =
      normalizedQuery.length === 0 ||
      booth.name.toLowerCase().includes(normalizedQuery) ||
      booth.menu.some((menu) => menu.toLowerCase().includes(normalizedQuery))

    return matchesDate && matchesCategory && matchesQuery
  })
}
