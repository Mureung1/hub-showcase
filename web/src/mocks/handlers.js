import { http, HttpResponse, delay } from 'msw'
import { initialNotifications } from './data'

// 가짜 서버가 들고 있는 데이터 — 메모리라 새로고침하면 초기값으로 되살아남 (DB 아님)
let notifications = [...initialNotifications]

export const handlers = [
  http.get('/api/notifications', async () => {
    await delay(500) // 로딩 상태를 화면에서 실제로 확인하기 위한 지연
    return HttpResponse.json(notifications)
  }),

  http.patch('/api/notifications/:id', async ({ params }) => {
    await delay(500)
    const { id } = params
    let updated = null

    notifications = notifications.map((n) => {
      if (n.id !== id) return n
      updated = { ...n, done: true }
      return updated
    })

    if (!updated) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(updated)
  }),
]
