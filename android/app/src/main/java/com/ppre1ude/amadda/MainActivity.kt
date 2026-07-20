package com.ppre1ude.amadda

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
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
            androidSharePlugin()?.notifyShareIntentReceived(share)
        }
    }

    private fun androidSharePlugin(): AndroidSharePlugin? {
        return getBridge().getPlugin(AndroidSharePlugin.PLUGIN_NAME)
            ?.instance as? AndroidSharePlugin
    }
}
