//! Lokify Municipal CLI Engine in Rust

use lokify_core::{calculate_priority_score, haversine_distance, is_duplicate_report, GeoPoint};
use std::env;

fn main() {
    println!("============================================================");
    println!(" 🏛️  LOKIFY MUNICIPAL CIVIC ANALYSIS ENGINE (Rust v1.2.3)");
    println!("============================================================");

    let args: Vec<String> = env::args().collect();
    if args.len() > 1 && (args[1] == "--help" || args[1] == "-h") {
        println!("Usage: lokify-cli [demo | benchmark]");
        return;
    }

    println!("[1/3] Benchmarking 100m Spatial Duplicate Filtering...");
    let report_a = GeoPoint { lat: 12.97160, lng: 77.59460 };
    let report_b = GeoPoint { lat: 12.97195, lng: 77.59485 }; // ~47m away
    let report_c = GeoPoint { lat: 12.98500, lng: 77.60500 }; // ~1.8km away

    let dist_ab = haversine_distance(&report_a, &report_b);
    let is_dup_ab = is_duplicate_report(&report_a, &report_b, 100.0);
    println!("  -> Report A to B Distance: {:.2}m | Duplicate? {}", dist_ab, is_dup_ab);

    let dist_ac = haversine_distance(&report_a, &report_c);
    let is_dup_ac = is_duplicate_report(&report_a, &report_c, 100.0);
    println!("  -> Report A to C Distance: {:.2}m | Duplicate? {}", dist_ac, is_dup_ac);

    println!("\n[2/3] Calculating Municipal Priority Scoring...");
    let pothole_score = calculate_priority_score(1, 4, true);
    let garbage_score = calculate_priority_score(3, 1, false);
    println!("  -> Severe Pothole (Category 1, 4 upvotes, safety hazard): Score = {}/100", pothole_score);
    println!("  -> Minor Garbage (Category 3, 1 upvote): Score = {}/100", garbage_score);

    println!("\n[3/3] Geospatial Performance Check...");
    let start = std::time::Instant::now();
    let mut count = 0;
    for i in 0..100_000 {
        let p = GeoPoint {
            lat: 12.9716 + (i as f64) * 0.00001,
            lng: 77.5946 + (i as f64) * 0.00001,
        };
        if is_duplicate_report(&report_a, &p, 100.0) {
            count += 1;
        }
    }
    let duration = start.elapsed();
    println!("  -> Scanned 100,000 spatial records in: {:?} (found {} matches within 100m)", duration, count);

    println!("============================================================");
    println!(" ✅ Engine Operational: Zero latency civic intelligence.");
    println!("============================================================");
}
