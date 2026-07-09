import { createContext, useContext, useMemo, useState } from 'react'
import { MEETINGS, currentUser } from '../data/mockData.js'

const AppStateContext = createContext(null)

let nextMeetingId = MEETINGS.length + 1

export function AppStateProvider({ children }) {
  const [meetings, setMeetings] = useState(MEETINGS)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const value = useMemo(() => {
    function updateMeeting(id, updater) {
      setMeetings((prev) => prev.map((m) => (m.id === id ? updater(m) : m)))
    }

    function applyToMeeting(meetingId) {
      updateMeeting(meetingId, (meeting) => {
        const status = meeting.type === 'flash' ? 'confirmed' : 'pending'
        const already = meeting.participants.some((p) => p.userId === currentUser.id)
        const participants = already
          ? meeting.participants.map((p) => (p.userId === currentUser.id ? { ...p, status } : p))
          : [
              ...meeting.participants,
              {
                userId: currentUser.id,
                nickname: currentUser.nickname,
                trustScore: currentUser.trustScore,
                status,
                appliedAt: meeting.startAt,
              },
            ]

        const isFull =
          meeting.type === 'flash' &&
          participants.filter((p) => p.status === 'confirmed').length >= meeting.capacity

        return { ...meeting, participants, status: isFull ? 'closed' : meeting.status }
      })
    }

    function cancelMyParticipation(meetingId) {
      updateMeeting(meetingId, (meeting) => ({
        ...meeting,
        participants: meeting.participants.map((p) =>
          p.userId === currentUser.id ? { ...p, status: 'cancelled' } : p,
        ),
        status: meeting.type === 'flash' && meeting.status === 'closed' ? 'recruiting' : meeting.status,
      }))
    }

    function respondToApplicant(meetingId, userId, decision) {
      updateMeeting(meetingId, (meeting) => ({
        ...meeting,
        participants: meeting.participants.map((p) => (p.userId === userId ? { ...p, status: decision } : p)),
      }))
    }

    function cancelMeeting(meetingId) {
      updateMeeting(meetingId, (meeting) => ({
        ...meeting,
        status: 'cancelled',
        participants: meeting.participants.map((p) => ({ ...p, status: 'cancelled' })),
      }))
    }

    function createMeeting(input) {
      const id = `m${nextMeetingId++}`
      const meeting = {
        id,
        status: 'recruiting',
        host: { id: currentUser.id, nickname: currentUser.nickname, trustScore: currentUser.trustScore },
        participants: [],
        ...input,
      }
      setMeetings((prev) => [meeting, ...prev])
      return id
    }

    return {
      meetings,
      currentUser,
      isLoggedIn,
      login: () => setIsLoggedIn(true),
      logout: () => setIsLoggedIn(false),
      applyToMeeting,
      cancelMyParticipation,
      respondToApplicant,
      cancelMeeting,
      createMeeting,
    }
  }, [meetings, isLoggedIn])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
