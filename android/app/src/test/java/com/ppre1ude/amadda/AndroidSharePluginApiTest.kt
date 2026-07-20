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

    private fun launchActivity(): PluginApiMainActivity {
        return Robolectric.buildActivity(PluginApiMainActivity::class.java, Intent(Intent.ACTION_MAIN))
            .create()
            .get()
    }

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

    override fun load() {
        onNewIntent(intent)
    }

    override fun finish() {
        finishRequested = true
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
