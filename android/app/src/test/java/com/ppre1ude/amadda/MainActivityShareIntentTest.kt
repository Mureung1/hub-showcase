package com.ppre1ude.amadda

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.android.controller.ActivityController

@RunWith(RobolectricTestRunner::class)
class MainActivityShareIntentTest {
    @Test
    fun `초기 공유는 getPendingShare에서 한 번만 소비되고 초기 onNewIntent는 이벤트를 발행하지 않는다`() {
        val activity = launchActivity(sendIntent(text = "https://example.com/initial")).get()

        assertEquals("https://example.com/initial", activity.consumePendingShare()?.text)
        assertNull(activity.consumePendingShare())
        assertTrue(activity.receivedShares.isEmpty())
    }

    @Test
    fun `재진입 공유는 이벤트로 한 번 전달되고 대기열에 남지 않는다`() {
        val controller = launchActivity(Intent(Intent.ACTION_MAIN))
        val activity = controller.get()

        controller.newIntent(sendIntent(text = "https://example.com/new"))

        assertEquals(listOf("https://example.com/new"), activity.receivedShares.map { it.text })
        assertNull(activity.consumePendingShare())
    }

    @Test
    fun `지원하지 않는 action과 MIME type은 Activity 경로에서 무시한다`() {
        val controller = launchActivity(
            sendIntent(
                action = Intent.ACTION_VIEW,
                text = "https://example.com/ignored-initial",
            ),
        )
        val activity = controller.get()

        controller.newIntent(
            sendIntent(
                type = "text/html",
                text = "https://example.com/ignored-new",
            ),
        )

        assertNull(activity.consumePendingShare())
        assertTrue(activity.receivedShares.isEmpty())
    }

    @Test
    fun `listener 있는 재진입 공유는 wake up 이벤트 뒤 pending으로 한 번 소비한다`() {
        val controller = launchRetainedEventActivity(Intent(Intent.ACTION_MAIN))
        val activity = controller.get()
        val plugin = ActivityBoundRetainedEventPlugin(activity)
        activity.sharePlugin = plugin
        val listener = RetainedEventPluginCall(
            JSObject().apply { put("eventName", "shareIntentReceived") },
        )

        plugin.addListener(listener)
        controller.newIntent(sendIntent(text = "https://example.com/event"))

        assertEquals(1, listener.resolvedPayloads.size)
        assertTrue(listener.resolvedPayloads.single()?.length() == 0)
        assertEquals("https://example.com/event", activity.consumePendingShare()?.text)
        assertNull(activity.consumePendingShare())
    }

    private fun launchActivity(intent: Intent): ActivityController<RecordingMainActivity> {
        return Robolectric.buildActivity(RecordingMainActivity::class.java, intent)
            .create()
    }

    private fun launchRetainedEventActivity(
        intent: Intent,
    ): ActivityController<RetainedEventMainActivity> {
        return Robolectric.buildActivity(RetainedEventMainActivity::class.java, intent)
            .create()
    }

    private fun sendIntent(
        action: String = Intent.ACTION_SEND,
        type: String = "text/plain",
        text: String,
    ): Intent {
        return Intent(action)
            .setType(type)
            .putExtra(Intent.EXTRA_TEXT, text)
    }
}

class RecordingMainActivity : MainActivity() {
    val receivedShares = mutableListOf<AndroidShare>()

    override fun load() {
        onNewIntent(intent)
    }

    override fun publishShareIntent(share: AndroidShare) {
        receivedShares += share
    }
}

class RetainedEventMainActivity : MainActivity() {
    lateinit var sharePlugin: AndroidSharePlugin

    override fun load() {
        onNewIntent(intent)
    }

    override fun publishShareIntent(share: AndroidShare) {
        sharePlugin.notifyShareIntentReceived(share)
    }
}

private class ActivityBoundRetainedEventPlugin(
    private val testActivity: AppCompatActivity,
) : AndroidSharePlugin() {
    override fun getActivity(): AppCompatActivity {
        return testActivity
    }
}

private class RetainedEventPluginCall(
    data: JSObject = JSObject(),
) : PluginCall(null, "AndroidShare", "callback", "test", data) {
    val resolvedPayloads = mutableListOf<JSObject?>()

    override fun resolve(data: JSObject) {
        resolvedPayloads += data
    }

    override fun resolve() {
        resolvedPayloads += null
    }
}
