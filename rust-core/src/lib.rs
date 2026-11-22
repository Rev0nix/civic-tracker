//! Lokify Core Rust Geospatial & Municipal Engine

use serde::{Deserialize, Serialize};

pub const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoPoint {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CivicReport {
    pub id: String,
    pub title: String,
    pub category_id: u32,
    pub location: GeoPoint,
    pub status: String,
    pub upvotes: u32,
}

/// Calculate the great-circle distance between two coordinates in meters using the Haversine formula
pub fn haversine_distance(p1: &GeoPoint, p2: &GeoPoint) -> f64 {
    let d_lat = (p2.lat - p1.lat).to_radians();
    let d_lng = (p2.lng - p1.lng).to_radians();

    let lat1 = p1.lat.to_radians();
    let lat2 = p2.lat.to_radians();

    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.cos() * lat2.cos() * (d_lng / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    EARTH_RADIUS_METERS * c
}

/// Detects if a new report is a duplicate of an existing report within the threshold distance (default: 100 meters)
pub fn is_duplicate_report(new_pos: &GeoPoint, existing_pos: &GeoPoint, threshold_meters: f64) -> bool {
    haversine_distance(new_pos, existing_pos) <= threshold_meters
}

/// Computes a priority score (0-100) based on severity, upvotes, and category
pub fn calculate_priority_score(category_id: u32, upvotes: u32, has_safety_keywords: bool) -> u32 {
    let base = match category_id {
        1 => 85, // Pothole / Road hazard
        4 => 80, // Water & Sewage leak
        2 => 70, // Streetlight defect
        3 => 65, // Garbage accumulation
        5 => 75, // Open drainage
        _ => 50,
    };

    let safety_bonus = if has_safety_keywords { 15 } else { 0 };
    let upvote_bonus = (upvotes * 5).min(20);

    (base + safety_bonus + upvote_bonus).min(100)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_haversine_distance() {
        // Bengaluru Vidhana Soudha to MG Road Metro (~2.1 km)
        let p1 = GeoPoint { lat: 12.9797, lng: 77.5907 };
        let p2 = GeoPoint { lat: 12.9756, lng: 77.6066 };
        let dist = haversine_distance(&p1, &p2);
        assert!((dist - 1780.0).abs() < 200.0);
    }

    #[test]
    fn test_duplicate_detection() {
        let p1 = GeoPoint { lat: 12.9716, lng: 77.5946 };
        let p2 = GeoPoint { lat: 12.9718, lng: 77.5948 }; // ~30 meters away
        assert!(is_duplicate_report(&p1, &p2, 100.0));
    }
}
