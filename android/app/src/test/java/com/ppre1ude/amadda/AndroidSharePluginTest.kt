package com.ppre1ude.amadda

import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.runner.RunWith
import org.junit.Test
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AndroidSharePluginTest {
    @Test
    fun `ACTION_SEND text plain 공유를 대기열에 넣는다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        val enqueued = router.routeInitialIntent(sendIntent(text = "https://example.com"))

        assertNotNull(enqueued)
        assertEquals("share-1", router.consumeInitialShare()?.id)
    }

    @Test
    fun `ACTION_SEND가 아닌 Intent는 무시한다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        val enqueued = router.routeInitialIntent(
            sendIntent(
                action = Intent.ACTION_VIEW,
                text = "https://example.com",
            ),
        )

        assertNull(enqueued)
        assertNull(router.consumeInitialShare())
    }

    @Test
    fun `text plain이 아닌 MIME type은 무시한다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        val enqueued = router.routeInitialIntent(
            sendIntent(
                type = "text/html",
                text = "https://example.com",
            ),
        )

        assertNull(enqueued)
        assertNull(router.consumeInitialShare())
    }

    @Test
    fun `charset 파라미터가 있는 text plain MIME type도 처리한다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        val enqueued = router.routeInitialIntent(
            sendIntent(
                type = "text/plain; charset=utf-8",
                text = "https://example.com",
            ),
        )

        assertNotNull(enqueued)
    }

    @Test
    fun `null Intent는 무시한다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        val enqueued = router.routeInitialIntent(null)

        assertNull(enqueued)
    }

    @Test
    fun `공유 extra 조회가 예외를 던지면 Intent를 무시한다`() {
        val router = AndroidShareIntentRouter { "share-1" }
        val malformedIntent = object : Intent(ACTION_SEND) {
            override fun getCharSequenceExtra(name: String?): CharSequence? {
                throw ClassCastException("unexpected extra")
            }
        }.setType("text/plain")

        val enqueued = router.routeInitialIntent(malformedIntent)

        assertNull(enqueued)
    }

    @Test
    fun `공유 텍스트와 선택 제목을 전달한다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        router.routeInitialIntent(
            sendIntent(
                text = "읽어볼 링크 https://example.com",
                title = "읽을거리",
            ),
        )

        val pending = router.consumeInitialShare()

        assertEquals("share-1", pending?.id)
        assertEquals("읽어볼 링크 https://example.com", pending?.text)
        assertEquals("읽을거리", pending?.title)
    }

    @Test
    fun `첫 소비 뒤에는 빈 결과를 반환한다`() {
        val router = AndroidShareIntentRouter { "share-1" }
        router.routeInitialIntent(sendIntent(text = "https://example.com"))

        assertNotNull(router.consumeInitialShare())
        assertNull(router.consumeInitialShare())
    }

    @Test
    fun `정상 소비 뒤에는 id를 보관하지 않는다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        assertNotNull(router.routeInitialIntent(sendIntent(text = "https://example.com/first")))
        assertNotNull(router.consumeInitialShare())

        assertNotNull(router.routeInitialIntent(sendIntent(text = "https://example.com/second")))
        assertEquals("https://example.com/second", router.consumeInitialShare()?.text)
    }

    @Test
    fun `초기 Intent와 새 Intent를 같은 라우터의 서로 다른 전달 경로로 처리한다`() {
        val ids = ArrayDeque(listOf("share-1", "share-2"))
        val router = AndroidShareIntentRouter { ids.removeFirst() }
        val receivedShares = mutableListOf<AndroidShare>()

        val initialEnqueued = router.routeInitialIntent(
            sendIntent(text = "https://example.com/initial"),
        )
        router.routeNewIntent(sendIntent(text = "https://example.com/new")) { share ->
            receivedShares += share
        }

        assertNotNull(initialEnqueued)
        assertEquals("https://example.com/initial", router.consumeInitialShare()?.text)
        assertNull(router.consumeInitialShare())
        assertEquals(listOf("https://example.com/new"), receivedShares.map { it.text })
    }

    @Test
    fun `재진입 공유는 이벤트에 한 번 전달하고 초기 대기열에는 남기지 않는다`() {
        val router = AndroidShareIntentRouter { "share-1" }
        val receivedShares = mutableListOf<AndroidShare>()

        router.routeNewIntent(sendIntent(text = "https://example.com/new")) { share ->
            receivedShares += share
        }

        assertEquals(1, receivedShares.size)
        assertEquals("share-1", receivedShares.single().id)
        assertNull(router.consumeInitialShare())
    }

    @Test
    fun `4096자를 넘는 공유 텍스트는 초기 대기열에 넣지 않는다`() {
        val router = AndroidShareIntentRouter { "share-1" }

        val enqueued = router.routeInitialIntent(
            sendIntent(text = "a".repeat(4097)),
        )

        assertNull(enqueued)
        assertNull(router.consumeInitialShare())
    }

    @Test
    fun `500자를 넘는 공유 제목은 재진입 이벤트로 전달하지 않는다`() {
        val router = AndroidShareIntentRouter { "share-1" }
        val receivedShares = mutableListOf<AndroidShare>()

        val received = router.routeNewIntent(
            sendIntent(
                text = "https://example.com",
                title = "a".repeat(501),
            ),
        ) { share ->
            receivedShares += share
        }

        assertNull(received)
        assertTrue(receivedShares.isEmpty())
    }

    private fun sendIntent(
        action: String = Intent.ACTION_SEND,
        type: String = "text/plain",
        text: String,
        title: String? = null,
    ): Intent {
        return Intent(action)
            .setType(type)
            .putExtra(Intent.EXTRA_TEXT, text)
            .apply {
                if (title != null) {
                    putExtra(Intent.EXTRA_TITLE, title)
                }
            }
    }
}
