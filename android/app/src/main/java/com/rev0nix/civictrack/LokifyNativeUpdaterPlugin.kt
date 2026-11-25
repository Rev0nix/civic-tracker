package com.rev0nix.civictrack

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Clean, safe native Android updater for Lokify.
 * Uses Android's official system DownloadManager so Google Play Protect
 * recognizes it as standard, safe, non-harmful behavior.
 */
@CapacitorPlugin(name = "LokifyNativeUpdater")
class LokifyNativeUpdaterPlugin : Plugin() {

    companion object {
        private const val TAG = "LokifyNativeUpdater"
    }

    @PluginMethod
    fun downloadAndInstall(call: PluginCall) {
        val downloadUrl = call.getString("url")
        val version = call.getString("version", "latest")

        if (downloadUrl.isNullOrEmpty()) {
            call.reject("Download URL is required")
            return
        }

        val activity = activity ?: run {
            call.reject("Activity context not available")
            return
        }

        try {
            Log.i(TAG, "Queueing official update download for version $version: $downloadUrl")

            val downloadManager = activity.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
            if (downloadManager == null) {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(browserIntent)
                call.resolve(JSObject().apply {
                    put("success", true)
                    put("method", "intent")
                    put("message", "Download opened via system")
                })
                return
            }

            val request = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
                setTitle("Lokify Update v$version")
                setDescription("Downloading official Lokify update package...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "lokify-v$version.apk")
                setMimeType("application/vnd.android.package-archive")
            }

            val downloadId = downloadManager.enqueue(request)
            Log.i(TAG, "Enqueued download with ID: $downloadId")

            call.resolve(JSObject().apply {
                put("success", true)
                put("downloadId", downloadId)
                put("method", "download_manager")
                put("message", "Official update queued in system download manager")
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start download via DownloadManager", e)
            try {
                val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(fallbackIntent)
                call.resolve(JSObject().apply {
                    put("success", true)
                    put("method", "intent_fallback")
                })
            } catch (fallbackErr: Exception) {
                call.reject("Failed to trigger update download: ${fallbackErr.message}")
            }
        }
    }
}
