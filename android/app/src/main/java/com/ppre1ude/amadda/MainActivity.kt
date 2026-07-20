package com.ppre1ude.amadda

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AndroidSharePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
