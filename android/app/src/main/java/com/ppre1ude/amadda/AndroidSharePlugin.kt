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

class AndroidShareIntentQueue(
    private val idGenerator: () -> String = { UUID.randomUUID().toString() },
) {
    private val pendingShares = ArrayDeque<AndroidShare>()
    private val issuedIds = mutableSetOf<String>()

    @Synchronized
    fun enqueue(intent: Intent): AndroidShare? {
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

        if (!issuedIds.add(share.id)) {
            return null
        }

        pendingShares.addLast(share)
        return share
    }

    @Synchronized
    fun consumePending(): AndroidShare? {
        return pendingShares.pollFirst()
    }

    private companion object {
        const val TEXT_PLAIN_MIME_TYPE = "text/plain"
    }
}

@CapacitorPlugin(name = "AndroidShare")
class AndroidSharePlugin : Plugin() {
    private val shareQueue = AndroidShareIntentQueue()

    override fun handleOnNewIntent(intent: Intent) {
        shareQueue.enqueue(intent)?.let { share ->
            notifyListeners(SHARE_INTENT_RECEIVED_EVENT, share.toJsObject())
        }
    }

    @PluginMethod
    fun getPendingShare(call: PluginCall) {
        call.resolve(shareQueue.consumePending()?.toJsObject() ?: JSObject())
    }

    @PluginMethod
    fun finishShare(call: PluginCall) {
        activity.finish()
        call.resolve()
    }

    private companion object {
        const val SHARE_INTENT_RECEIVED_EVENT = "shareIntentReceived"
    }
}
