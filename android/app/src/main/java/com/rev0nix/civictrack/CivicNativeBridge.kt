package com.rev0nix.civictrack

import kotlin.math.*

/**
 * High-performance Native Kotlin Civic Utilities for Lokify Android
 */
object CivicNativeBridge {
    private const val EARTH_RADIUS_METERS = 6371000.0

    /**
     * Native Haversine distance calculator in Kotlin
     */
    fun calculateDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2.0) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2).pow(2.0)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return EARTH_RADIUS_METERS * c
    }

    /**
     * 100m proximity duplicate detection in Kotlin
     */
    fun isDuplicateLocation(lat1: Double, lon1: Double, lat2: Double, lon2: Double, thresholdMeters: Double = 100.0): Boolean {
        return calculateDistanceMeters(lat1, lon1, lat2, lon2) <= thresholdMeters
    }

    /**
     * Issue Priority Scoring Algorithm in Kotlin
     */
    fun calculatePriorityScore(categoryId: Int, upvotes: Int, isDangerous: Boolean): Int {
        var baseScore = when (categoryId) {
            1 -> 90 // Pothole / Road hazard
            4 -> 85 // Water & Sewage leak
            2 -> 70 // Streetlight out
            3 -> 60 // Garbage overflow
            else -> 50
        }
        if (isDangerous) baseScore += 20
        baseScore += (upvotes * 5).coerceAtMost(30)
        return baseScore.coerceIn(0, 100)
    }
}
