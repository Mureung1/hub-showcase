package com.ppre1ude.amadda

import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
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
    private var pendingShare: AndroidShare? = null

    @Synchronized
    fun routeInitialIntent(intent: Intent): AndroidShare? {
        val share = parseIntent(intent) ?: return null
        pendingShare = share
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
        val share = pendingShare
        pendingShare = null
        return share
    }

    @Synchronized
    fun replacePendingShare(share: AndroidShare) {
        pendingShare = share
    }

    private fun parseIntent(intent: Intent): AndroidShare? {
        if (intent.action != Intent.ACTION_SEND || intent.type != TEXT_PLAIN_MIME_TYPE) {
            return null
        }

        val text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() ?: return null
        val title = intent.getCharSequenceExtra(Intent.EXTRA_TITLE)?.toString()
        if (text.length > MAX_TEXT_LENGTH || title?.length ?: 0 > MAX_TITLE_LENGTH) {
            return null
        }
        val share = AndroidShare(
            id = idGenerator(),
            text = text,
            title = title,
        )
        return share
    }

    private companion object {
        const val TEXT_PLAIN_MIME_TYPE = "text/plain"
        const val MAX_TEXT_LENGTH = 4096
        const val MAX_TITLE_LENGTH = 500
    }
}

@CapacitorPlugin(name = "AndroidShare")
open class AndroidSharePlugin : Plugin() {
    @PluginMethod
    fun getPendingShare(call: PluginCall) {
        call.resolve(consumePendingShare()?.toJsObject() ?: JSObject())
    }

    @PluginMethod
    fun finishShare(call: PluginCall) {
        activity.finish()
        call.resolve()
    }

    fun notifyShareIntentReceived(share: AndroidShare) {
        if (hasListeners(SHARE_INTENT_RECEIVED_EVENT)) {
            notifyListeners(SHARE_INTENT_RECEIVED_EVENT, share.toJsObject())
            return
        }

        (activity as? MainActivity)?.replacePendingShare(share)
    }

    internal fun consumePendingShare(): AndroidShare? {
        return (activity as? MainActivity)?.consumePendingShare()
    }

    companion object {
        const val PLUGIN_NAME = "AndroidShare"

        private const val SHARE_INTENT_RECEIVED_EVENT = "shareIntentReceived"
    }
}
