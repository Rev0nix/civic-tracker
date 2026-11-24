package com.rev0nix.civictrack

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
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
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Native Android In-App APK Downloader and Installer for Lokify
 * Downloads APK directly within the app without opening an external browser,
 * and launches the Android system package installer.
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

        Log.i(TAG, "Starting native in-app APK download for version $version from $downloadUrl")

        // Run download on background thread to keep UI completely smooth
        thread {
            var connection: HttpURLConnection? = null
            var inputStream: InputStream? = null
            var outputStream: FileOutputStream? = null

            try {
                // Also enqueue to Android DownloadManager so it is recorded in system downloads
                try {
                    val dm = activity.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                    if (dm != null) {
                        val req = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
                            setTitle("Lokify v$version Update")
                            setDescription("Lokify municipal app update package")
                            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                            setDestinationInExternalPublicDir(
                                Environment.DIRECTORY_DOWNLOADS,
                                "lokify-v$version.apk"
                            )
                            setMimeType("application/vnd.android.package-archive")
                        }
                        dm.enqueue(req)
                        Log.i(TAG, "Enqueued update to Android system DownloadManager")
                    }
                } catch (dmEx: Exception) {
                    Log.w(TAG, "DownloadManager enqueue skipped: ${dmEx.message}")
                }

                // Follow HTTP 301/302 redirects (e.g. GitHub Releases -> Azure/S3 storage)
                var currentUrl = downloadUrl
                var redirectCount = 0
                val maxRedirects = 6

                while (redirectCount < maxRedirects) {
                    val urlObj = URL(currentUrl)
                    connection = urlObj.openConnection() as HttpURLConnection
                    connection.instanceFollowRedirects = true
                    connection.connectTimeout = 15000
                    connection.readTimeout = 30000
                    connection.setRequestProperty("User-Agent", "Lokify-App-Android")
                    connection.connect()

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 || responseCode == 308) {
                        val newLocation = connection.getHeaderField("Location")
                        if (newLocation != null) {
                            currentUrl = newLocation
                            connection.disconnect()
                            redirectCount++
                            continue
                        }
                    }
                    break
                }

                val totalBytes = connection?.contentLengthLong ?: -1L
                inputStream = connection?.inputStream ?: throw IllegalStateException("Failed to open connection stream")

                // Target destination in app's private external or cache dir (mapped in FileProvider)
                val targetDir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: activity.cacheDir
                if (!targetDir.exists()) {
                    targetDir.mkdirs()
                }

                val apkFile = File(targetDir, "lokify-v$version-update.apk")
                if (apkFile.exists()) {
                    apkFile.delete()
                }

                outputStream = FileOutputStream(apkFile)
                val buffer = ByteArray(16 * 1024)
                var bytesRead: Int
                var totalBytesRead = 0L
                var lastReportedPercent = 0

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead

                    if (totalBytes > 0) {
                        val percent = ((totalBytesRead * 100) / totalBytes).toInt()
                        if (percent - lastReportedPercent >= 5 || percent >= 100) {
                            lastReportedPercent = percent
                            val progressData = JSObject().apply {
                                put("progress", percent)
                                put("downloadedBytes", totalBytesRead)
                                put("totalBytes", totalBytes)
                                put("status", "downloading")
                            }
                            notifyListeners("downloadProgress", progressData)
                        }
                    }
                }
                outputStream.flush()

                Log.i(TAG, "APK download complete: ${apkFile.absolutePath} ($totalBytesRead bytes)")

                // Notify final 100% progress
                val completeData = JSObject().apply {
                    put("progress", 100)
                    put("downloadedBytes", totalBytesRead)
                    put("totalBytes", totalBytesRead)
                    put("status", "completed")
                }
                notifyListeners("downloadProgress", completeData)

                // Launch Android Package Installer immediately in-app
                activity.runOnUiThread {
                    try {
                        val authority = "${activity.packageName}.fileprovider"
                        val contentUri = FileProvider.getUriForFile(activity, authority, apkFile)

                        val installIntent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(contentUri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }

                        Log.i(TAG, "Launching Android package installer for URI: $contentUri")
                        activity.startActivity(installIntent)

                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("filePath", apkFile.absolutePath)
                            put("message", "Package installer launched in-app successfully")
                        })
                    } catch (installErr: Exception) {
                        Log.e(TAG, "Failed to launch package installer", installErr)
                        call.reject("Failed to trigger package installer: ${installErr.message}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "In-app download error", e)
                activity.runOnUiThread {
                    call.reject("In-app download failed: ${e.message}")
                }
            } finally {
                try { outputStream?.close() } catch (_: Exception) {}
                try { inputStream?.close() } catch (_: Exception) {}
                try { connection?.disconnect() } catch (_: Exception) {}
            }
        }
    }
}
