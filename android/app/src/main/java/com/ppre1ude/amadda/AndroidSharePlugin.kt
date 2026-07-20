package com.ppre1ude.amadda

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.ArrayDeque
import java.util.UUID

data class AndroidShare(
    val id: String,
    val text: String,
    val title: String?,
) {
    fun toJsObject(): JSObject {
        return JSObject().apply {
            put("id", id)
            put("text", text)
            title?.let { put("title", it) }
        }
    }
}

class AndroidShareIntentRouter(
    private val idGenerator: () -> String = { UUID.randomUUID().toString() },
) {
    private val initialShares = ArrayDeque<AndroidShare>()

    @Synchronized
    fun routeInitialIntent(intent: Intent): AndroidShare? {
        val share = parseIntent(intent) ?: return null
        initialShares.addLast(share)
        return share
    }

    fun routeNewIntent(
        intent: Intent,
        onShareReceived: (AndroidShare) -> Unit,
    ): AndroidShare? {
        val share = parseIntent(intent) ?: return null
        onShareReceived(share)
        return share
    }

    @Synchronized
    fun consumeInitialShare(): AndroidShare? {
        return initialShares.pollFirst()
    }

    private fun parseIntent(intent: Intent): AndroidShare? {
        if (intent.action != Intent.ACTION_SEND || intent.type != TEXT_PLAIN_MIME_TYPE) {
            return null
        }

        val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() ?: return null
        val title = intent.getCharSequenceExtra(Intent.EXTRA_TITLE)?.toString()
        val share = AndroidShare(
            id = idGenerator(),
            text = text,
            title = title,
        )
        return share
    }

    private companion object {
        const val TEXT_PLAIN_MIME_TYPE = "text/plain"
    }
}

@CapacitorPlugin(name = "AndroidShare")
class AndroidSharePlugin : Plugin() {
    @PluginMethod
    fun getPendingShare(call: PluginCall) {
        val router = (activity as? MainActivity)?.shareIntentRouter
        call.resolve(router?.consumeInitialShare()?.toJsObject() ?: JSObject())
    }

    @PluginMethod
    fun finishShare(call: PluginCall) {
        activity.finish()
        call.resolve()
    }

    fun notifyShareIntentReceived(share: AndroidShare) {
        notifyListeners(SHARE_INTENT_RECEIVED_EVENT, share.toJsObject())
    }

    companion object {
        const val PLUGIN_NAME = "AndroidShare"

        private const val SHARE_INTENT_RECEIVED_EVENT = "shareIntentReceived"
    }
}
