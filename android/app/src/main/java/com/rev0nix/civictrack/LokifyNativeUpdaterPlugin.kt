package com.rev0nix.civictrack

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Clean, safe native Android updater for Lokify.
 * Directly streams Lokify.apk in a background thread, writes to verified external files storage,
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

        // Run direct streaming download on background thread
        thread {
            try {
                Log.i(TAG, "Starting direct streaming download of Lokify.apk v$version from $downloadUrl")

                val destDir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: activity.cacheDir
                val destFile = File(destDir, APK_FILENAME)
                if (destFile.exists()) {
                    destFile.delete()
                }

                // Handle HTTP redirects up to 5 hops
                var currentUrl = downloadUrl
                var connection: HttpURLConnection
                var redirectCount = 0

                while (true) {
                    val urlObj = URL(currentUrl)
                    connection = urlObj.openConnection() as HttpURLConnection
                    connection.instanceFollowRedirects = true
                    connection.setRequestProperty("User-Agent", "Lokify-App-Updater")
                    connection.connectTimeout = 20000
                    connection.readTimeout = 40000
                    connection.connect()

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 ||
                        responseCode == 308) {
                        val newUrl = connection.getHeaderField("Location")
                        connection.disconnect()
                        if (newUrl != null && redirectCount < 5) {
                            currentUrl = newUrl
                            redirectCount++
                            continue
                        }
                    }
                    break
                }

                if (connection.responseCode !in 200..299) {
                    throw Exception("Server returned HTTP ${connection.responseCode}")
                }

                val inputStream: InputStream = connection.inputStream
                val outputStream = FileOutputStream(destFile)

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var downloadedBytes = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    downloadedBytes += bytesRead
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()
                connection.disconnect()

                Log.i(TAG, "Lokify.apk successfully downloaded (${destFile.length()} bytes). Launching package installer!")

                // Launch package installer on UI thread
                activity.runOnUiThread {
                    try {
                        val contentUri = FileProvider.getUriForFile(
                            activity,
                            "${activity.packageName}.fileprovider",
                            destFile
                        )

                        val installIntent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(contentUri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        activity.startActivity(installIntent)

                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("downloaded", true)
                            put("message", "Lokify.apk downloaded! Package installer launched.")
                        })
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to launch package installer", e)
                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("downloaded", true)
                            put("message", "Lokify.apk downloaded. Tap Install to proceed.")
                        })
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Direct download failed, falling back to system intent: ${e.message}", e)
                activity.runOnUiThread {
                    try {
                        val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        activity.startActivity(fallbackIntent)
                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("downloaded", false)
                            put("message", "Downloading via system browser")
                        })
                    } catch (intentErr: Exception) {
                        call.reject("Failed to download update: ${e.message}")
                    }
                }
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
            val destDir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: activity.cacheDir
            val destFile = File(destDir, APK_FILENAME)

            if (destFile.exists() && destFile.length() > 0) {
                val contentUri = FileProvider.getUriForFile(
                    activity,
                    "${activity.packageName}.fileprovider",
                    destFile
                )
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
