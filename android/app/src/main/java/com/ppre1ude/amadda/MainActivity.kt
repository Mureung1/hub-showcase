package com.ppre1ude.amadda

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity

open class MainActivity : BridgeActivity() {
    internal val shareIntentRouter = AndroidShareIntentRouter()
    private var isBridgeInitializing = false

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AndroidSharePlugin::class.java)
        isBridgeInitializing = true
        try {
            super.onCreate(savedInstanceState)
        } finally {
            isBridgeInitializing = false
        }
        shareIntentRouter.routeInitialIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)

        if (isBridgeInitializing) {
            return
        }

        shareIntentRouter.routeNewIntent(intent) { share ->
            publishShareIntent(share)
        }
    }

    internal open fun publishShareIntent(share: AndroidShare) {
        androidSharePlugin()?.notifyShareIntentReceived(share)
    }

    internal fun consumePendingShare(): AndroidShare? {
        return shareIntentRouter.consumeInitialShare()
    }

    internal fun replacePendingShare(share: AndroidShare) {
        shareIntentRouter.replacePendingShare(share)
    }

    private fun androidSharePlugin(): AndroidSharePlugin? {
        return getBridge().getPlugin(AndroidSharePlugin.PLUGIN_NAME)
            ?.instance as? AndroidSharePlugin
    }
}
