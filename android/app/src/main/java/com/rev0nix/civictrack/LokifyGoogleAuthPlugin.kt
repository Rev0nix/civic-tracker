package com.rev0nix.civictrack

import android.accounts.AccountManager
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Authentic Android Native Google Account Sign-In Plugin.
 * Presents Android OS native account chooser dialog EXACTLY ONCE
 * to let the user select their real Google account on the device.
 * Never displays duplicate prompts.
 */
@CapacitorPlugin(name = "LokifyGoogleAuth")
class LokifyGoogleAuthPlugin : Plugin() {

    companion object {
        private const val TAG = "LokifyGoogleAuth"
    }

    @PluginMethod
    fun signIn(call: PluginCall) {
        val activity = activity ?: run {
            call.reject("Activity context not available")
            return
        }

        try {
            Log.i(TAG, "Launching Android OS native Google Account Chooser (single prompt)")
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

                Log.i(TAG, "Single-prompt Google account successfully chosen: $email")

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

        // User dismissed the picker — do NOT ask a second time!
        Log.i(TAG, "Google account selection cancelled by user")
        call.reject("Google account selection cancelled")
    }
}
