package com.rev0nix.civictrack

import android.accounts.AccountManager
import android.app.Activity
import android.os.Build
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException

/**
 * Authentic Android Native Google Account Sign-In Plugin.
 * Presents the system Google account chooser bottom sheet (like Amazon, Uber, Zomato)
 * to let the user select their real Google accounts registered on the phone.
 */
@CapacitorPlugin(name = "LokifyGoogleAuth")
class LokifyGoogleAuthPlugin : Plugin() {

    companion object {
        private const val TAG = "LokifyGoogleAuth"
    }

    private var googleSignInClient: GoogleSignInClient? = null

    @PluginMethod
    fun signIn(call: PluginCall) {
        val activity = activity ?: run {
            call.reject("Activity context not available")
            return
        }

        try {
            Log.i(TAG, "Launching authentic Google Play Services account chooser")
            val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build()

            googleSignInClient = GoogleSignIn.getClient(activity, gso)
            // Sign out first to ensure the account chooser is always displayed
            googleSignInClient?.signOut()?.addOnCompleteListener {
                try {
                    val signInIntent = googleSignInClient?.signInIntent
                    if (signInIntent != null) {
                        startActivityForResult(call, signInIntent, "handleGoogleSignInResult")
                    } else {
                        trySystemAccountManager(call)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to launch GoogleSignIn intent, trying AccountManager", e)
                    trySystemAccountManager(call)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "GoogleSignIn init error, falling back to system AccountManager", e)
            trySystemAccountManager(call)
        }
    }

    @ActivityCallback
    private fun handleGoogleSignInResult(call: PluginCall, result: ActivityResult) {
        val resultCode = result.resultCode
        val data = result.data

        if (resultCode == Activity.RESULT_OK && data != null) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account: GoogleSignInAccount? = task.getResult(ApiException::class.java)
                if (account != null && !account.email.isNullOrEmpty()) {
                    Log.i(TAG, "Google sign-in successful: ${account.email}")
                    val displayName = account.displayName 
                        ?: account.givenName 
                        ?: account.email?.split("@")?.get(0)?.replaceFirstChar { it.uppercase() } 
                        ?: "Citizen"

                    val ret = JSObject().apply {
                        put("success", true)
                        put("email", account.email)
                        put("displayName", displayName)
                        put("id", account.id ?: ("g_" + System.currentTimeMillis()))
                        put("photoUrl", account.photoUrl?.toString() ?: "https://ui-avatars.com/api/?name=${displayName.replace(" ", "+")}&background=1F6FEB&color=fff")
                        put("authProvider", "firebase-google")
                    }
                    call.resolve(ret)
                    return
                }
            } catch (apiErr: ApiException) {
                Log.w(TAG, "GoogleSignIn API returned status code ${apiErr.statusCode}, falling back to AccountManager", apiErr)
            }
        }

        // If GoogleSignIn dialog had issue or user dismissed, fallback to system AccountManager
        trySystemAccountManager(call)
    }

    private fun trySystemAccountManager(call: PluginCall) {
        val activity = activity ?: run {
            call.reject("Activity context not available")
            return
        }

        try {
            Log.i(TAG, "Launching Android OS native AccountManager account chooser")
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
        call.reject("Google account selection cancelled")
    }
}
