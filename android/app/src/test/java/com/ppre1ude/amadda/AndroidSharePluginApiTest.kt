package com.ppre1ude.amadda

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AndroidSharePluginApiTest {
    @Test
    fun `getPendingShare는 대기 공유를 resolve하고 다음 호출에는 빈 결과를 반환한다`() {
        val activity = launchActivity()
        activity.shareIntentRouter.routeInitialIntent(
            sendIntent(text = "https://example.com/pending"),
        )
        val plugin = ActivityBoundAndroidSharePlugin(activity)
        val firstCall = ApiRecordingPluginCall()
        val secondCall = ApiRecordingPluginCall()

        plugin.getPendingShare(firstCall)
        plugin.getPendingShare(secondCall)

        assertEquals("https://example.com/pending", firstCall.resolvedPayloads.single()?.getString("text"))
        assertTrue(secondCall.resolvedPayloads.single()?.length() == 0)
    }

    @Test
    fun `finishShare는 Activity 종료를 요청하고 호출을 resolve한다`() {
        val activity = launchActivity()
        val plugin = ActivityBoundAndroidSharePlugin(activity)
        val call = ApiRecordingPluginCall()

        plugin.finishShare(call)

        assertTrue(activity.finishRequested)
        assertEquals(listOf(null), call.resolvedPayloads)
    }

    @Test
    fun `listener 없는 재진입 공유는 최신 한 건만 getPendingShare로 소비한다`() {
        val controller = launchActivityController()
        val activity = controller.get()
        val plugin = ActivityBoundAndroidSharePlugin(activity)
        activity.sharePlugin = plugin
        val listener = ApiRecordingPluginCall(
            JSObject().apply { put("eventName", "shareIntentReceived") },
        )
        val firstCall = ApiRecordingPluginCall()
        val secondCall = ApiRecordingPluginCall()

        controller.newIntent(sendIntent(text = "https://example.com/first"))
        controller.newIntent(sendIntent(text = "https://example.com/latest"))
        plugin.addListener(listener)
        plugin.getPendingShare(firstCall)
        plugin.getPendingShare(secondCall)

        assertTrue(listener.resolvedPayloads.isEmpty())
        assertEquals("https://example.com/latest", firstCall.resolvedPayloads.single()?.getString("text"))
        assertTrue(secondCall.resolvedPayloads.single()?.length() == 0)
    }

    @Test
    fun `listener 있는 재진입 공유는 이벤트로 한 번 전달하고 pending에 남기지 않는다`() {
        val controller = launchActivityController()
        val activity = controller.get()
        val plugin = ActivityBoundAndroidSharePlugin(activity)
        activity.sharePlugin = plugin
        val listener = ApiRecordingPluginCall(
            JSObject().apply { put("eventName", "shareIntentReceived") },
        )
        val pendingCall = ApiRecordingPluginCall()

        plugin.addListener(listener)
        controller.newIntent(sendIntent(text = "https://example.com/event"))
        plugin.getPendingShare(pendingCall)

        assertEquals(1, listener.resolvedPayloads.size)
        assertEquals("https://example.com/event", listener.resolvedPayloads.single()?.getString("text"))
        assertTrue(pendingCall.resolvedPayloads.single()?.length() == 0)
    }

    @Test
    fun `초기 공유와 listener 있는 재진입 공유는 서로 다른 경로로 한 번씩 전달한다`() {
        val controller = launchActivityController(sendIntent(text = "https://example.com/initial"))
        val activity = controller.get()
        val plugin = ActivityBoundAndroidSharePlugin(activity)
        activity.sharePlugin = plugin
        val listener = ApiRecordingPluginCall(
            JSObject().apply { put("eventName", "shareIntentReceived") },
        )
        val initialCall = ApiRecordingPluginCall()
        val secondPendingCall = ApiRecordingPluginCall()

        plugin.addListener(listener)
        controller.newIntent(sendIntent(text = "https://example.com/reentry"))
        plugin.getPendingShare(initialCall)
        plugin.getPendingShare(secondPendingCall)

        assertEquals("https://example.com/reentry", listener.resolvedPayloads.single()?.getString("text"))
        assertEquals("https://example.com/initial", initialCall.resolvedPayloads.single()?.getString("text"))
        assertTrue(secondPendingCall.resolvedPayloads.single()?.length() == 0)
    }

    private fun launchActivity(): PluginApiMainActivity {
        return launchActivityController()
            .get()
    }

    private fun launchActivityController(
        intent: Intent = Intent(Intent.ACTION_MAIN),
    ) = Robolectric.buildActivity(PluginApiMainActivity::class.java, intent)
        .create()

    private fun sendIntent(text: String): Intent {
        return Intent(Intent.ACTION_SEND)
            .setType("text/plain")
            .putExtra(Intent.EXTRA_TEXT, text)
    }
}

private class ActivityBoundAndroidSharePlugin(
    private val testActivity: AppCompatActivity,
) : AndroidSharePlugin() {
    override fun getActivity(): AppCompatActivity {
        return testActivity
    }
}

private class PluginApiMainActivity : MainActivity() {
    var finishRequested = false
    lateinit var sharePlugin: AndroidSharePlugin

    override fun load() {
        onNewIntent(intent)
    }

    override fun finish() {
        finishRequested = true
    }

    override fun publishShareIntent(share: AndroidShare) {
        sharePlugin.notifyShareIntentReceived(share)
    }
}

private class ApiRecordingPluginCall(
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
