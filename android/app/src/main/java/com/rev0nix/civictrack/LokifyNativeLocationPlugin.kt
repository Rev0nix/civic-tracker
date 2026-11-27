package com.rev0nix.civictrack

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.util.Locale

/**
 * Authentic Android Native High-Accuracy GPS & Locality Engine.
 * Uses Android device hardware GPS & native Geocoder service.
 * Delivers accurate neighborhood, ward, and city locality without Webview timeouts or CORS issues.
 */
@CapacitorPlugin(
    name = "LokifyNativeLocation",
    permissions = [
        Permission(
            alias = "location",
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ]
        )
    ]
)
class LokifyNativeLocationPlugin : Plugin() {

    companion object {
        private const val TAG = "LokifyNativeLocation"
    }

    @PluginMethod
    fun getCurrentLocation(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Application context is unavailable")
            return
        }

        val hasFine = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) {
            requestPermissionForAlias("location", call, "locationPermissionCallback")
            return
        }

        fetchAccurateLocation(call)
    }

    @PermissionCallback
    private fun locationPermissionCallback(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Context is unavailable")
            return
        }
        val hasFine = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (hasFine || hasCoarse) {
            fetchAccurateLocation(call)
        } else {
            call.reject("Location permission was denied by user")
        }
    }

    @SuppressLint("MissingPermission")
    private fun fetchAccurateLocation(call: PluginCall) {
        val ctx = context ?: run {
            call.reject("Context is unavailable")
            return
        }

        val locationManager = ctx.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (locationManager == null) {
            call.reject("LocationManager service unavailable")
            return
        }

        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

        if (!isGpsEnabled && !isNetworkEnabled) {
            call.reject("Device GPS and Network location providers are disabled")
            return
        }

        // 1. Check last known locations
        var lastKnown: Location? = null
        if (isGpsEnabled) {
            lastKnown = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
        }
        if (lastKnown == null && isNetworkEnabled) {
            lastKnown = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        }

        // If last known location is fresh (under 45 seconds old), resolve right away
        val now = System.currentTimeMillis()
        if (lastKnown != null && (now - lastKnown.time) < 45000) {
            Log.i(TAG, "Resolving with fresh cached GPS location (${lastKnown.latitude}, ${lastKnown.longitude})")
            resolveLocation(call, lastKnown)
            return
        }

        // 2. Request a fresh GPS satellite fix with a safety timeout
        val mainHandler = Handler(Looper.getMainLooper())
        var isResolved = false

        val listener = object : LocationListener {
            override fun onLocationChanged(loc: Location) {
                if (isResolved) return
                isResolved = true
                locationManager.removeUpdates(this)
                Log.i(TAG, "Live GPS satellite fix acquired (${loc.latitude}, ${loc.longitude})")
                resolveLocation(call, loc)
            }

            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        val timeoutRunnable = Runnable {
            if (!isResolved) {
                isResolved = true
                locationManager.removeUpdates(listener)
                if (lastKnown != null) {
                    Log.i(TAG, "Live GPS timed out; falling back to last known location")
                    resolveLocation(call, lastKnown)
                } else {
                    call.reject("GPS location request timed out")
                }
            }
        }

        mainHandler.postDelayed(timeoutRunnable, 7000)

        try {
            if (isGpsEnabled) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    0L,
                    0f,
                    listener,
                    Looper.getMainLooper()
                )
            }
            if (isNetworkEnabled) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    0L,
                    0f,
                    listener,
                    Looper.getMainLooper()
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception requesting location updates", e)
            if (lastKnown != null && !isResolved) {
                isResolved = true
                mainHandler.removeCallbacks(timeoutRunnable)
                resolveLocation(call, lastKnown)
            } else if (!isResolved) {
                call.reject("Failed to request GPS updates: ${e.message}")
            }
        }
    }

    private fun resolveLocation(call: PluginCall, location: Location) {
        val lat = location.latitude
        val lng = location.longitude
        val accuracy = location.accuracy

        var subLocality: String? = null
        var locality: String? = null
        var subAdminArea: String? = null
        var adminArea: String? = null
        var fullAddress: String? = null

        try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses: List<Address>? = geocoder.getFromLocation(lat, lng, 1)
            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                subLocality = addr.subLocality
                locality = addr.locality
                subAdminArea = addr.subAdminArea
                adminArea = addr.adminArea
                fullAddress = addr.getAddressLine(0)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Native Geocoder reverse lookup failed", e)
        }

        // Build clean human-friendly locality string: e.g. "Indiranagar, Bengaluru" or "Kuvempunagar, Mysuru" or "Hassan"
        val cleanLocality = when {
            !subLocality.isNullOrBlank() && !locality.isNullOrBlank() -> "$subLocality, $locality"
            !subLocality.isNullOrBlank() -> subLocality
            !locality.isNullOrBlank() -> locality
            !subAdminArea.isNullOrBlank() -> subAdminArea
            !adminArea.isNullOrBlank() -> adminArea
            else -> "Near ${String.format(Locale.US, "%.3f, %.3f", lat, lng)}"
        }

        Log.i(TAG, "Accurate locality resolved: '$cleanLocality' at ($lat, $lng)")

        val ret = JSObject().apply {
            put("success", true)
            put("latitude", lat)
            put("longitude", lng)
            put("accuracy", accuracy)
            put("locality", cleanLocality)
            put("city", locality ?: subAdminArea ?: "Local Area")
            put("fullAddress", fullAddress ?: "GPS: $lat, $lng")
        }
        call.resolve(ret)
    }
}
