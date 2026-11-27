package com.rev0nix.civictrack

import android.accounts.AccountManager
import android.app.Activity
import android.os.Build
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Authentic Android Native Google Account Authentication Plugin.
 * Supports:
 * 1. getDeviceAccounts() - Discovers Google accounts registered on device to populate Amazon/One-Tap account picker
 * 2. signIn() - Android native account chooser fallback
 */
@CapacitorPlugin(name = "LokifyGoogleAuth")
class LokifyGoogleAuthPlugin : Plugin() {

    companion object {
        private const val TAG = "LokifyGoogleAuth"
    }

    /**
     * Retrieve the list of Google accounts registered on the phone.
     * Used by the Amazon-style Account Chooser Bottom Sheet.
     */
    @PluginMethod
    fun getDeviceAccounts(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Context unavailable")
            return
        }

        try {
            val am = AccountManager.get(ctx)
            val accounts = am.getAccountsByType("com.google")
            val list = JSArray()

            for (acc in accounts) {
                val email = acc.name
                if (!email.isNullOrBlank() && email.contains("@")) {
                    val username = email.split("@")[0]
                    val nameParts = username.split(".", "_", "-")
                    val displayName = nameParts.joinToString(" ") { part ->
                        part.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                    }.ifEmpty { "Citizen" }

                    val item = JSObject().apply {
                        put("email", email)
                        put("displayName", displayName)
                        put("id", "g_" + Math.abs(email.hashCode()))
                        put("photoUrl", "https://ui-avatars.com/api/?name=${displayName.replace(" ", "+")}&background=1F6FEB&color=fff")
                    }
                    list.put(item)
                }
            }

            Log.i(TAG, "Discovered ${list.length()} Google account(s) on device")
            val ret = JSObject().apply {
                put("accounts", list)
                put("count", list.length())
            }
            call.resolve(ret)
        } catch (e: Exception) {
            Log.w(TAG, "Could not query device accounts", e)
            val ret = JSObject().apply {
                put("accounts", JSArray())
                put("count", 0)
            }
            call.resolve(ret)
        }
    }

    /**
     * System account chooser fallback.
     */
    @PluginMethod
    fun signIn(call: PluginCall) {
        val activity = activity ?: run {
            call.reject("Activity context not available")
            return
        }

        try {
            Log.i(TAG, "Launching Android OS native Google Account Chooser")
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AccountManager.newChooseAccountIntent(
                    null,
                    null,
                    arrayOf("com.google"),
                    null,
                    null,
                    null,
                    null
                )
            } else {
                @Suppress("DEPRECATION")
                AccountManager.newChooseAccountIntent(
                    null,
                    null,
                    arrayOf("com.google"),
                    false,
                    null,
                    null,
                    null,
                    null
                )
            }
            startActivityForResult(call, intent, "handleSystemAccountResult")
        } catch (e: Exception) {
            Log.e(TAG, "System AccountManager failed", e)
            call.reject("Failed to open Google accounts chooser: ${e.message}")
        }
    }

    @ActivityCallback
    private fun handleSystemAccountResult(call: PluginCall, result: ActivityResult) {
        val resultCode = result.resultCode
        val data = result.data

        if (resultCode == Activity.RESULT_OK && data != null) {
            val email = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
            if (!email.isNullOrEmpty()) {
                val username = email.split("@")[0]
                val nameParts = username.split(".", "_", "-")
                val formattedName = nameParts.joinToString(" ") { part ->
                    part.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
                }.ifEmpty { "Citizen" }

                Log.i(TAG, "Google account successfully chosen: $email")

                val ret = JSObject().apply {
                    put("success", true)
                    put("email", email)
                    put("displayName", formattedName)
                    put("id", "g_" + Math.abs(email.hashCode()))
                    put("photoUrl", "https://ui-avatars.com/api/?name=${formattedName.replace(" ", "+")}&background=1F6FEB&color=fff")
                    put("authProvider", "firebase-google")
                }
                call.resolve(ret)
                return
            }
        }

        Log.i(TAG, "Google account selection cancelled by user")
        call.reject("Google account selection cancelled")
    }
}
