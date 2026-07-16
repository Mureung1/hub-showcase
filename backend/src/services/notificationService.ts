import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'
import webpush from 'web-push'

const prisma = new PrismaClient()

// VAPID 키 설정
webpush.setVapidDetails(
  'mailto:naver-challenge@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

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
 * 웹 푸시 알림 발송
 */
async function sendPushNotification(payload: NotificationPayload) {
  try {
    // 사용자의 푸시 구독 가져오기
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: payload.userId },
    })

    if (subscriptions.length === 0) {
      console.log(`  → 구독 정보 없음: ${payload.userId}`)
      return
    }

    // 알림 페이로드
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: `마감까지 D-${payload.dDay}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `posting-${payload.postingId}`,
      timestamp: new Date().toISOString(),
    })

    // 각 구독에 푸시 발송
    for (const sub of subscriptions) {
      try {
        const subscription = JSON.parse(sub.subscriptionJson)
        await webpush.sendNotification(subscription, notificationPayload)
        console.log(`  → 알림 발송 성공: ${payload.userId}`)
      } catch (error: any) {
        // 구독이 유효하지 않으면 삭제
        if (error.statusCode === 410) {
          console.log(`  → 만료된 구독 제거: ${sub.id}`)
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        } else {
          console.error(`  → 알림 발송 실패 (${sub.id}):`, error.message)
        }
      }
    }
  } catch (error) {
    console.error('  → 알림 발송 중 오류:', error)
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
