package com.rev0nix.civictrack

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * Clean, safe native Android updater for Lokify.
 * Downloads Lokify.apk directly via Android's official system DownloadManager
 * and automatically triggers the system package installer.
 */
@CapacitorPlugin(name = "LokifyNativeUpdater")
class LokifyNativeUpdaterPlugin : Plugin() {

    companion object {
        private const val TAG = "LokifyNativeUpdater"
        private const val APK_FILENAME = "Lokify.apk"
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
            Log.i(TAG, "Queueing official Lokify.apk update download for v$version: $downloadUrl")

            // Clean up any stale Lokify.apk in public downloads directory
            try {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val existingApk = File(downloadsDir, APK_FILENAME)
                if (existingApk.exists()) {
                    existingApk.delete()
                }
            } catch (cleanupErr: Exception) {
                Log.w(TAG, "Could not delete existing $APK_FILENAME: ${cleanupErr.message}")
            }

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
                setDescription("Downloading official Lokify.apk update package...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, APK_FILENAME)
                setMimeType("application/vnd.android.package-archive")
            }

            val downloadId = downloadManager.enqueue(request)
            Log.i(TAG, "Enqueued download with ID: $downloadId for $APK_FILENAME")

            // Register BroadcastReceiver to automatically trigger package installation when complete
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
                    if (id == downloadId) {
                        try {
                            activity.unregisterReceiver(this)
                        } catch (_: Exception) {}

                        try {
                            val downloadUri = downloadManager.getUriForDownloadedFile(downloadId)
                            Log.i(TAG, "Download complete! Opening package installer for URI: $downloadUri")

                            if (downloadUri != null) {
                                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                                    setDataAndType(downloadUri, "application/vnd.android.package-archive")
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                activity.startActivity(installIntent)
                                return
                            }

                            // Fallback using FileProvider
                            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                            val apkFile = File(downloadsDir, APK_FILENAME)
                            if (apkFile.exists()) {
                                val contentUri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", apkFile)
                                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                                    setDataAndType(contentUri, "application/vnd.android.package-archive")
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                activity.startActivity(installIntent)
                            }
                        } catch (installErr: Exception) {
                            Log.e(TAG, "Could not open installer directly from receiver", installErr)
                            try {
                                val viewDownloads = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                }
                                activity.startActivity(viewDownloads)
                            } catch (_: Exception) {}
                        }
                    }
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.registerReceiver(receiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED)
            } else {
                activity.registerReceiver(receiver, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
            }

            call.resolve(JSObject().apply {
                put("success", true)
                put("downloadId", downloadId)
                put("fileName", APK_FILENAME)
                put("method", "download_manager")
                put("message", "Downloading Lokify.apk in-app. Installer will open automatically when finished.")
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

    @PluginMethod
    fun openInstaller(call: PluginCall) {
        val activity = activity ?: run {
            call.reject("Activity context not available")
            return
        }

        try {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val apkFile = File(downloadsDir, APK_FILENAME)

            if (apkFile.exists()) {
                val contentUri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", apkFile)
                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(contentUri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                activity.startActivity(installIntent)
                call.resolve(JSObject().apply { put("success", true) })
                return
            }

            // Fallback: Open system Downloads app
            val viewDownloads = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(viewDownloads)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Could not launch installer: ${e.message}")
        }
    }
}
