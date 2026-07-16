import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NotificationPayload {
  userId: string
  postingId: string
  title: string
  dDay: number
  receptionEndDate: Date
}

/**
 * D-Day 알림 스케줄링
 * 매일 자정에 D-3, D-1인 공고 찾아서 알림 발송
 */
export function startNotificationScheduler() {
  // 매일 자정(0시 0분 0초)에 실행
  cron.schedule('0 0 0 * * *', async () => {
    console.log('🔔 D-Day 알림 스케줄 실행:', new Date().toLocaleString('ko-KR'))

    try {
      const today = new Date()
      const threeDaysLater = new Date(today)
      threeDaysLater.setDate(today.getDate() + 3)
      const oneDayLater = new Date(today)
      oneDayLater.setDate(today.getDate() + 1)

      // D-3인 공고들
      const threeDayPostings = await prisma.scrap.findMany({
        where: {
          notifyEnabled: true,
          posting: {
            receptionEndDate: {
              gte: new Date(threeDaysLater.toDateString()),
              lt: new Date(new Date(threeDaysLater.toDateString()).getTime() + 86400000), // 다음날
            },
          },
        },
        include: {
          posting: true,
          user: true,
        },
      })

      // D-1인 공고들
      const oneDayPostings = await prisma.scrap.findMany({
        where: {
          notifyEnabled: true,
          posting: {
            receptionEndDate: {
              gte: new Date(oneDayLater.toDateString()),
              lt: new Date(new Date(oneDayLater.toDateString()).getTime() + 86400000),
            },
          },
        },
        include: {
          posting: true,
          user: true,
        },
      })

      console.log(`📬 D-3 알림 대상: ${threeDayPostings.length}건`)
      console.log(`📬 D-1 알림 대상: ${oneDayPostings.length}건`)

      // 알림 생성
      const allNotifications: NotificationPayload[] = [
        ...threeDayPostings.map(scrap => ({
          userId: scrap.userId,
          postingId: scrap.postingId,
          title: scrap.posting.title,
          dDay: 3,
          receptionEndDate: scrap.posting.receptionEndDate!,
        })),
        ...oneDayPostings.map(scrap => ({
          userId: scrap.userId,
          postingId: scrap.postingId,
          title: scrap.posting.title,
          dDay: 1,
          receptionEndDate: scrap.posting.receptionEndDate!,
        })),
      ]

      // 각 사용자에게 알림 발송 (여기서는 로그만 남기고, 나중에 웹 푸시 연동)
      for (const notification of allNotifications) {
        console.log(`📤 알림 발송: ${notification.userId} - "${notification.title}" (D-${notification.dDay})`)
        await sendPushNotification(notification)
      }

      console.log(`✅ D-Day 알림 스케줄 완료`)
    } catch (error) {
      console.error('❌ D-Day 알림 스케줄 실패:', error)
    }
  })
}

/**
 * 웹 푸시 알림 발송 (준비 중)
 * 나중에 web-push 라이브러리와 Service Worker 연동
 */
async function sendPushNotification(payload: NotificationPayload) {
  try {
    // 나중에 구현: web-push로 실제 알림 발송
    // const result = await webpush.sendNotification(subscription, JSON.stringify({
    //   title: payload.title,
    //   body: `마감까지 D-${payload.dDay}`,
    //   icon: '/icon-192x192.png',
    //   badge: '/badge-72x72.png',
    // }))

    // 현재는 DB에만 저장 (선택)
    // await prisma.notification.create({
    //   data: {
    //     userId: payload.userId,
    //     postingId: payload.postingId,
    //     title: payload.title,
    //     body: `마감까지 D-${payload.dDay}`,
    //     read: false,
    //   },
    // })

    console.log(`  → 알림 발송 준비 완료: ${payload.userId}`)
  } catch (error) {
    console.error('  → 알림 발송 실패:', error)
  }
}

/**
 * 특정 사용자에게 즉시 알림 발송 (테스트용)
 */
export async function sendTestNotification(userId: string) {
  try {
    // 사용자의 D-3 이내 공고 찾기
    const today = new Date()
    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(today.getDate() + 3)

    const postings = await prisma.scrap.findMany({
      where: {
        userId,
        notifyEnabled: true,
        posting: {
          receptionEndDate: {
            gte: today,
            lte: threeDaysLater,
          },
        },
      },
      include: {
        posting: true,
      },
      take: 1,
    })

    if (postings.length === 0) {
      console.log('⚠️ 테스트할 D-Day 공고가 없습니다')
      return
    }

    const scrap = postings[0]
    const dDay = Math.ceil(
      (scrap.posting.receptionEndDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    await sendPushNotification({
      userId,
      postingId: scrap.postingId,
      title: scrap.posting.title,
      dDay,
      receptionEndDate: scrap.posting.receptionEndDate!,
    })

    console.log(`✅ 테스트 알림 발송 완료`)
  } catch (error) {
    console.error('❌ 테스트 알림 실패:', error)
  }
}
