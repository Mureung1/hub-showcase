package com.ppre1ude.amadda

import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.runner.RunWith
import org.junit.Test
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AndroidSharePluginTest {
    @Test
    fun `ACTION_SEND text plain 공유를 대기열에 넣는다`() {
        val queue = AndroidShareIntentQueue { "share-1" }

        val enqueued = queue.enqueue(sendIntent(text = "https://example.com"))

        assertNotNull(enqueued)
        assertEquals("share-1", queue.consumePending()?.id)
    }

    @Test
    fun `ACTION_SEND가 아닌 Intent는 무시한다`() {
        val queue = AndroidShareIntentQueue { "share-1" }

        val enqueued = queue.enqueue(
            sendIntent(
                action = Intent.ACTION_VIEW,
                text = "https://example.com",
            ),
        )

        assertNull(enqueued)
        assertNull(queue.consumePending())
    }

    @Test
    fun `text plain이 아닌 MIME type은 무시한다`() {
        val queue = AndroidShareIntentQueue { "share-1" }

        val enqueued = queue.enqueue(
            sendIntent(
                type = "text/html",
                text = "https://example.com",
            ),
        )

        assertNull(enqueued)
        assertNull(queue.consumePending())
    }

    @Test
    fun `공유 텍스트와 선택 제목을 전달한다`() {
        val queue = AndroidShareIntentQueue { "share-1" }

        queue.enqueue(
            sendIntent(
                text = "읽어볼 링크 https://example.com",
                title = "읽을거리",
            ),
        )

        val pending = queue.consumePending()

        assertEquals("share-1", pending?.id)
        assertEquals("읽어볼 링크 https://example.com", pending?.text)
        assertEquals("읽을거리", pending?.title)
    }

    @Test
    fun `첫 소비 뒤에는 빈 결과를 반환한다`() {
        val queue = AndroidShareIntentQueue { "share-1" }
        queue.enqueue(sendIntent(text = "https://example.com"))

        assertNotNull(queue.consumePending())
        assertNull(queue.consumePending())
    }

    @Test
    fun `같은 id는 한 번만 소비한다`() {
        val queue = AndroidShareIntentQueue { "share-1" }

        assertNotNull(queue.enqueue(sendIntent(text = "https://example.com/first")))
        assertNotNull(queue.consumePending())

        assertNull(queue.enqueue(sendIntent(text = "https://example.com/second")))
        assertNull(queue.consumePending())
    }

    @Test
    fun `초기 Intent와 새 Intent를 같은 파서와 대기열로 처리한다`() {
        val ids = ArrayDeque(listOf("share-1", "share-2"))
        val queue = AndroidShareIntentQueue { ids.removeFirst() }

        val initialEnqueued = queue.enqueue(sendIntent(text = "https://example.com/initial"))
        val newEnqueued = queue.enqueue(sendIntent(text = "https://example.com/new"))

        assertNotNull(initialEnqueued)
        assertNotNull(newEnqueued)
        assertEquals("https://example.com/initial", queue.consumePending()?.text)
        assertEquals("https://example.com/new", queue.consumePending()?.text)
        assertNull(queue.consumePending())
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
