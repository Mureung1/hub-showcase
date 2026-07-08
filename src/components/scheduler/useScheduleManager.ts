import { useMemo, useState } from 'react'
import { initialCategories, initialSchedules } from './data'
import type { Category, Schedule, ScheduleCategoryId, ShareGroup } from './types'

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function useScheduleManager() {
  const [categories, setCategories] = useState(initialCategories)
  const [viewDate, setViewDate] = useState(() => new Date(2026, 6, 1))
  const [selectedDay, setSelectedDay] = useState(7)
  const [schedules, setSchedules] = useState(initialSchedules)
  const [notice, setNotice] = useState('')
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftTime, setDraftTime] = useState('')

  const year = viewDate.getFullYear()
  const monthIndex = viewDate.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const selectedKey = dateKey(year, monthIndex, selectedDay)

  const calendarDays = useMemo(
    () => [...Array<null>(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)],
    [daysInMonth, firstWeekday],
  )

  const selectedSchedules = schedules.filter((schedule) => schedule.date === selectedKey)

  const moveMonth = (offset: number) => {
    setViewDate(new Date(year, monthIndex + offset, 1))
    setSelectedDay(1)
    setEditingScheduleId(null)
    setNotice('')
  }

  const selectDay = (day: number) => {
    setSelectedDay(day)
    setEditingScheduleId(null)
    setNotice('')
  }

  const addSchedule = (selectedCategory: Category) => {
    const nextSchedule: Schedule = {
      id: Date.now(),
      date: selectedKey,
      title: `${selectedCategory.name} 일정`,
      time: '',
      category: selectedCategory.id,
      tone: selectedCategory.tone,
      completed: false,
    }

    setSchedules((current) => [...current, nextSchedule])
    setNotice(`${monthIndex + 1}월 ${selectedDay}일에 ${selectedCategory.name} 일정을 추가했어요.`)
  }

  const addPersonalSchedule = () => {
    const personalCategory = categories.find((category) => category.id === 'personal')
    if (personalCategory) addSchedule(personalCategory)
  }

  const openScheduleEditor = (schedule: Schedule) => {
    if (editingScheduleId === schedule.id) {
      setEditingScheduleId(null)
      return
    }

    setEditingScheduleId(schedule.id)
    setDraftTitle(schedule.title)
    setDraftTime(schedule.time)
    setNotice('')
  }

  const saveScheduleChanges = (scheduleId: number) => {
    const title = draftTitle.trim()
    if (!title) {
      setNotice('일정 이름을 입력해주세요.')
      return
    }

    setSchedules((current) => current.map((schedule) => (
      schedule.id === scheduleId
        ? { ...schedule, title, time: draftTime }
        : schedule
    )))
    setEditingScheduleId(null)
    setNotice('일정 이름과 시간을 저장했어요.')
  }

  const deleteSchedule = (schedule: Schedule) => {
    setSchedules((current) => current.filter((item) => item.id !== schedule.id))
    setEditingScheduleId(null)
    setNotice(`‘${schedule.title}’ 일정을 삭제했어요.`)
  }

  const toggleScheduleCompletion = (scheduleId: number) => {
    const target = schedules.find((schedule) => schedule.id === scheduleId)
    if (!target) return

    setSchedules((current) => current.map((schedule) => (
      schedule.id === scheduleId
        ? { ...schedule, completed: !schedule.completed }
        : schedule
    )))
    setNotice(target.completed ? '일정을 미완료 상태로 되돌렸어요.' : '일정을 완료했어요!')
  }

  const toggleVisibleGroup = (categoryId: ScheduleCategoryId, group: ShareGroup) => {
    setCategories((current) => current.map((category) => {
      if (category.id !== categoryId) return category
      const visibleTo = category.visibleTo.includes(group)
        ? category.visibleTo.filter((name) => name !== group)
        : [...category.visibleTo, group]
      return { ...category, visibleTo }
    }))
  }

  return {
    categories,
    schedules,
    selectedSchedules,
    year,
    monthIndex,
    selectedDay,
    calendarDays,
    notice,
    categorySettingsOpen,
    editingScheduleId,
    draftTitle,
    draftTime,
    moveMonth,
    selectDay,
    addSchedule,
    addPersonalSchedule,
    openScheduleEditor,
    saveScheduleChanges,
    deleteSchedule,
    toggleScheduleCompletion,
    toggleVisibleGroup,
    toggleCategorySettings: () => setCategorySettingsOpen((open) => !open),
    closeCategorySettings: () => setCategorySettingsOpen(false),
    cancelScheduleEditor: () => setEditingScheduleId(null),
    setDraftTitle,
    setDraftTime,
  }
}

export type ScheduleManager = ReturnType<typeof useScheduleManager>
