package com.rev0nix.civictrack

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
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
 * Downloads APK directly within the app without opening any external browser,
 * and launches the Android system package installer on screen.
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

        Log.i(TAG, "Starting strictly in-app APK download for version $version from $downloadUrl")

        // Run download on background thread to keep UI completely smooth
        thread {
            var connection: HttpURLConnection? = null
            var inputStream: InputStream? = null
            var outputStream: FileOutputStream? = null

            try {
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
                inputStream = connection?.inputStream ?: throw IllegalStateException("Failed to open download stream from $currentUrl")

                // Target destination in app's cache directory (always writable, mapped in FileProvider)
                val targetDir = activity.cacheDir
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
                        if (percent - lastReportedPercent >= 4 || percent >= 100) {
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
                apkFile.setReadable(true, false)

                Log.i(TAG, "In-app APK download finished: ${apkFile.absolutePath} ($totalBytesRead bytes)")

                // Notify final 100% progress
                val completeData = JSObject().apply {
                    put("progress", 100)
                    put("downloadedBytes", totalBytesRead)
                    put("totalBytes", totalBytesRead)
                    put("status", "completed")
                }
                notifyListeners("downloadProgress", completeData)

                // Launch Android Package Installer strictly in-app
                activity.runOnUiThread {
                    try {
                        // Check if Android 8+ requires permission to install from this source
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.packageManager.canRequestPackageInstalls()) {
                            Log.i(TAG, "Requesting unknown sources permission for Lokify")
                            val permissionIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                data = Uri.parse("package:${activity.packageName}")
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            activity.startActivity(permissionIntent)
                        }

                        val authority = "${activity.packageName}.fileprovider"
                        val contentUri = FileProvider.getUriForFile(activity, authority, apkFile)

                        val installIntent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(contentUri, "application/vnd.android.package-archive")
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }

                        Log.i(TAG, "Launching Android package installer in-app for URI: $contentUri")
                        activity.startActivity(installIntent)

                        call.resolve(JSObject().apply {
                            put("success", true)
                            put("filePath", apkFile.absolutePath)
                            put("message", "Android package installer prompt launched in-app")
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
