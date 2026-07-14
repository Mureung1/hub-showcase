import { useEffect, useMemo, useState } from 'react'
import * as api from './api'
import type { Category, GroupTone, Schedule, ScheduleCategoryId, ShareGroup } from './types'

export function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function useScheduleManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [viewDate, setViewDate] = useState(() => new Date(2026, 6, 1))
  const [selectedDay, setSelectedDay] = useState(7)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  useEffect(() => {
    let cancelled = false

    api.fetchSchedules()
      .then((loaded) => {
        if (!cancelled) setSchedules(loaded)
      })
      .catch(() => {
        if (!cancelled) setNotice('일정을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => {
        if (!cancelled) setSchedulesLoading(false)
      })

    api.fetchCategories()
      .then((loaded) => {
        if (!cancelled) setCategories(loaded.map((category) => ({ ...category, visibleTo: [] })))
      })
      .catch(() => {
        if (!cancelled) setNotice('카테고리를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      })

    return () => {
      cancelled = true
    }
  }, [])

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

  const addSchedule = async (selectedCategory: Category) => {
    try {
      const created = await api.createSchedule({
        categoryId: selectedCategory.id,
        date: selectedKey,
        title: `${selectedCategory.name} 일정`,
        time: '',
      })
      setSchedules((current) => [...current, created])
      setNotice(`${monthIndex + 1}월 ${selectedDay}일에 ${selectedCategory.name} 일정을 추가했어요.`)
    } catch {
      setNotice('일정을 추가하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const openScheduleEditor = (schedule: Schedule) => {
    setRenamingId(null)

    if (editingScheduleId === schedule.id) {
      setEditingScheduleId(null)
      return
    }

    setEditingScheduleId(schedule.id)
    setDraftTitle(schedule.title)
    setDraftTime(schedule.time)
    setNotice('')
  }

  const startRename = (schedule: Schedule) => {
    setEditingScheduleId(null)
    setRenamingId(schedule.id)
    setRenameDraft(schedule.title)
  }

  const commitRename = async (scheduleId: string) => {
    const title = renameDraft.trim()
    setRenamingId(null)
    if (!title) return

    try {
      const updated = await api.updateSchedule(scheduleId, { title })
      setSchedules((current) => current.map((schedule) => (schedule.id === scheduleId ? updated : schedule)))
    } catch {
      setNotice('일정 이름을 저장하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const cancelRename = () => setRenamingId(null)

  const saveScheduleChanges = async (scheduleId: string) => {
    const title = draftTitle.trim()
    if (!title) {
      setNotice('일정 이름을 입력해주세요.')
      return
    }

    try {
      const updated = await api.updateSchedule(scheduleId, { title, time: draftTime })
      setSchedules((current) => current.map((schedule) => (schedule.id === scheduleId ? updated : schedule)))
      setEditingScheduleId(null)
      setNotice('일정 이름과 시간을 저장했어요.')
    } catch {
      setNotice('일정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const deleteSchedule = async (schedule: Schedule) => {
    try {
      await api.deleteSchedule(schedule.id)
      setSchedules((current) => current.filter((item) => item.id !== schedule.id))
      setEditingScheduleId(null)
      setNotice(`'${schedule.title}' 일정을 삭제했어요.`)
    } catch {
      setNotice('일정을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const toggleScheduleCompletion = async (scheduleId: string) => {
    const target = schedules.find((schedule) => schedule.id === scheduleId)
    if (!target) return

    try {
      const updated = await api.updateSchedule(scheduleId, { completed: !target.completed })
      setSchedules((current) => current.map((schedule) => (schedule.id === scheduleId ? updated : schedule)))
      setNotice(target.completed ? '일정을 미완료 상태로 되돌렸어요.' : '일정을 완료했어요!')
    } catch {
      setNotice('일정 상태를 변경하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const createCategory = async (name: string, tone: GroupTone) => {
    try {
      const created = await api.createCategory({ name, tone })
      setCategories((current) => [...current, { ...created, visibleTo: [] }])
      setNotice(`'${created.name}' 카테고리를 추가했어요.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '카테고리를 추가하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  const deleteCategory = async (categoryId: ScheduleCategoryId) => {
    try {
      await api.deleteCategory(categoryId)
      setCategories((current) => current.filter((category) => category.id !== categoryId))
      setNotice('카테고리를 삭제했어요.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '카테고리를 삭제하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
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
    schedulesLoading,
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
    renamingId,
    renameDraft,
    moveMonth,
    selectDay,
    addSchedule,
    openScheduleEditor,
    saveScheduleChanges,
    deleteSchedule,
    toggleScheduleCompletion,
    createCategory,
    deleteCategory,
    toggleVisibleGroup,
    toggleCategorySettings: () => setCategorySettingsOpen((open) => !open),
    closeCategorySettings: () => setCategorySettingsOpen(false),
    cancelScheduleEditor: () => setEditingScheduleId(null),
    setDraftTitle,
    setDraftTime,
    startRename,
    commitRename,
    cancelRename,
    setRenameDraft,
  }
}

export type ScheduleManager = ReturnType<typeof useScheduleManager>
