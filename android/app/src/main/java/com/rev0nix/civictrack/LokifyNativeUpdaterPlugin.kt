package com.rev0nix.civictrack

import android.app.Activity
import android.app.DownloadManager
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
 * Clean, safe native Android updater for Lokify.
 * Streams Lokify.apk in a background thread, writes to verified internal cache and public downloads,
 * and launches the Android system package installer directly.
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

                // Write to internal cacheDir (guaranteed accessible to FileProvider in sandbox)
                val destFile = File(activity.cacheDir, APK_FILENAME)
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

                destFile.setReadable(true, false)
                Log.i(TAG, "Lokify.apk downloaded successfully (${destFile.length()} bytes). Launching package installer!")

                // Also copy to public Downloads folder as external backup
                try {
                    val publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val publicFile = File(publicDir, APK_FILENAME)
                    destFile.copyTo(publicFile, overwrite = true)
                    publicFile.setReadable(true, false)
                } catch (copyErr: Exception) {
                    Log.w(TAG, "Could not copy to public downloads: ${copyErr.message}")
                }

                // Launch package installer on UI thread
                activity.runOnUiThread {
                    launchInstallerForFile(activity, destFile, call)
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

        val cacheFile = File(activity.cacheDir, APK_FILENAME)
        if (cacheFile.exists() && cacheFile.length() > 0) {
            launchInstallerForFile(activity, cacheFile, call)
            return
        }

        // Try public Downloads folder
        val publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val publicFile = File(publicDir, APK_FILENAME)
        if (publicFile.exists() && publicFile.length() > 0) {
            launchInstallerForFile(activity, publicFile, call)
            return
        }

        // Try external files directory
        val extFile = File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_FILENAME)
        if (extFile.exists() && extFile.length() > 0) {
            launchInstallerForFile(activity, extFile, call)
            return
        }

        // Fallback: Open system Downloads app
        try {
            val viewDownloads = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(viewDownloads)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Could not launch installer: ${e.message}")
        }
    }

    private fun launchInstallerForFile(activity: Activity, apkFile: File, call: PluginCall?) {
        try {
            if (!apkFile.exists() || apkFile.length() == 0L) {
                call?.reject("APK file is missing or empty")
                return
            }

            // Check unknown sources installation permission on Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!activity.packageManager.canRequestPackageInstalls()) {
                    Log.i(TAG, "Lokify requires install unknown apps permission, directing user to settings")
                    val manageIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${activity.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    activity.startActivity(manageIntent)
                    call?.resolve(JSObject().apply {
                        put("success", true)
                        put("needPermission", true)
                        put("message", "Please enable 'Allow from this source' in Settings, then tap Install.")
                    })
                    return
                }
            }

            apkFile.setReadable(true, false)

            val contentUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            Log.i(TAG, "Launching PackageInstaller for contentUri: $contentUri")

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
            }

            // Explicitly grant URI read permissions to any intent resolvers
            try {
                val resolveInfoList = activity.packageManager.queryIntentActivities(installIntent, 0)
                for (resolveInfo in resolveInfoList) {
                    val pkg = resolveInfo.activityInfo.packageName
                    activity.grantUriPermission(pkg, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
            } catch (permErr: Exception) {
                Log.w(TAG, "Could not grant explicit URI permission: ${permErr.message}")
            }

            activity.startActivity(installIntent)

            call?.resolve(JSObject().apply {
                put("success", true)
                put("installed", true)
                put("message", "Package installer opened on screen!")
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch installer intent, trying downloads screen", e)
            try {
                val viewDownloads = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(viewDownloads)
                call?.resolve(JSObject().apply {
                    put("success", true)
                    put("message", "Opened Downloads folder. Tap Lokify.apk to install.")
                })
            } catch (fallbackErr: Exception) {
                call?.reject("Could not launch package installer: ${e.message}")
            }
        }
    }
}
