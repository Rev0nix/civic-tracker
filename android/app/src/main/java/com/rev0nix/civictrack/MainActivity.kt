package com.rev0nix.civictrack

import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    companion object {
        private const val TAG = "LokifyMainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(LokifyNativeUpdaterPlugin::class.java)
        registerPlugin(LokifyGoogleAuthPlugin::class.java)
        registerPlugin(LokifyNativeLocationPlugin::class.java)
        super.onCreate(savedInstanceState)
        Log.i(TAG, "Lokify CivicTrack Native Android Engine initialized with Native Location, Google Sign-In & In-App Updater.")
    }
}
