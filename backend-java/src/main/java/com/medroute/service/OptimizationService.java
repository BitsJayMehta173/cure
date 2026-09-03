package com.medroute.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class OptimizationService {

    private static final double R = 6371.0; // Earth radius in km

    public static final Map<String, double[]> STATE_COORDINATES = Map.of(
            "Maharashtra", new double[]{19.0760, 72.8777},
            "Karnataka", new double[]{12.9716, 77.5946},
            "Delhi NCR", new double[]{28.6139, 77.2090},
            "Tamil Nadu", new double[]{13.0827, 80.2707},
            "Rajasthan", new double[]{26.9124, 75.7873}
    );

    public static final Map<String, double[]> CITY_COORDINATES = Map.ofEntries(
            Map.entry("Mumbai", new double[]{19.0760, 72.8777}),
            Map.entry("Pune", new double[]{18.5204, 73.8567}),
            Map.entry("Nagpur", new double[]{21.1458, 79.0882}),
            Map.entry("Bangalore", new double[]{12.9716, 77.5946}),
            Map.entry("Mysore", new double[]{12.2958, 76.6394}),
            Map.entry("New Delhi", new double[]{28.6139, 77.2090}),
            Map.entry("Gurgaon", new double[]{28.4595, 77.0266}),
            Map.entry("Noida", new double[]{28.5355, 77.3910}),
            Map.entry("Chennai", new double[]{13.0827, 80.2707}),
            Map.entry("Coimbatore", new double[]{11.0168, 76.9558}),
            Map.entry("Jaipur", new double[]{26.9124, 75.7873}),
            Map.entry("Jodhpur", new double[]{26.2389, 73.0243}),
            Map.entry("Udaipur", new double[]{24.5854, 73.7125}),
            Map.entry("Kota", new double[]{25.2138, 75.8648}),
            Map.entry("Ajmer", new double[]{26.4499, 74.6399})
    );

    // ───────────────────────────────────────────────
    // Transport Recommendation — lives in the ML pipeline
    // ───────────────────────────────────────────────
    public static class TransportInfo {
        public final String mode;
        public final String emoji;
        public final double estimatedHours; // Realistic travel time in hours
        public final String description;
        public final boolean isLongDistance; // true if outside local 40km zone

        public TransportInfo(String mode, String emoji, double estimatedHours, String description, boolean isLongDistance) {
            this.mode = mode;
            this.emoji = emoji;
            this.estimatedHours = estimatedHours;
            this.description = description;
            this.isLongDistance = isLongDistance;
        }
    }

    /**
     * Smart transport selector.
     *
     * Override mode is STRICTLY RESPECTED if explicitly chosen (except AI):
     *   bike/auto  → Always 20 km/h (will push appointment dates out heavily for long distances)
     *   bus        → Always 50 km/h
     *   train      → Always 70 km/h + boarding
     *   flight     → Always 600 km/h + airport
     *
     * If mode is "ai" or empty, the AI picks the optimal fastest mode.
     *
     * Zones (AI default):
     *   < 15 km    → Auto/Cab      (~20 km/h)
     *   15–50 km   → City Bus/Cab  (~25 km/h)
     *   50–300 km  → Bus/Train based on urgency
     *   > 300 km   → Train/Flight based on urgency
     */
    public TransportInfo getTransportInfo(double distanceKm, String urgencyLevel, String overrideMode) {
        String level = urgencyLevel.toUpperCase();
        String mode = overrideMode != null ? overrideMode.trim().toLowerCase() : "";

        if (!mode.isEmpty() && !mode.equals("ai")) {
            switch (mode) {
                case "bike/auto":
                    return new TransportInfo("Auto / Cab", "🚕", distanceKm / 20.0,
                            "Custom: Bike/Auto (20 km/h)", distanceKm >= 50);

                case "bus":
                    return new TransportInfo("Bus", "🚌", distanceKm / 50.0,
                            "Custom: Bus (50 km/h)", distanceKm >= 50);

                case "train":
                    return new TransportInfo("Train", "🚆", distanceKm / 70.0 + 0.5,
                            "Custom: Train (70 km/h + boarding)", distanceKm >= 50);

                case "flight":
                    return new TransportInfo("Flight", "✈️", distanceKm / 600.0 + 2.5,
                            "Custom: Flight (600 km/h + airport overhead)", distanceKm >= 50);
            }
        }
        // Fallthrough: AI picks the best mode based on distance + urgency


        // ── Zone 1: Hyper-local (< 15 km) ──────────────────────────────────
        if (distanceKm < 15) {
            return new TransportInfo("Auto / Cab", "🚕", distanceKm / 20.0,
                    "Auto or cab — city traffic (~20 km/h)", false);
        }

        // ── Zone 2: City fringe (15–50 km) ──────────────────────────────────
        if (distanceKm < 50) {
            double hrs = distanceKm / 30.0; // 30 km/h average city-edge transit
            return new TransportInfo("City Bus / Cab", "🚌", hrs,
                    "City bus or cab recommended (~30 km/h)", false);
        }

        // ── Zone 3: Regional (50–300 km) — bus or train based on urgency ────
        if (distanceKm < 300) {
            switch (level) {
                case "CRITICAL":
                    double critHrs = distanceKm / 80.0 + 0.5;
                    return new TransportInfo("Express Train", "🚄", critHrs,
                            "Critical: Express train — fastest land option (+30 min boarding)", true);
                case "URGENT":
                    double urgHrs = distanceKm / 70.0 + 0.5;
                    return new TransportInfo("Train", "🚆", urgHrs,
                            "Urgent: Train recommended for this distance (+30 min boarding)", true);
                default: // ROUTINE
                    double routHrs = distanceKm / 50.0;
                    return new TransportInfo("Bus", "🚌", routHrs,
                            "Routine: Bus — comfortable for this distance (~50 km/h)", true);
            }
        }

        // ── Zone 4: Long haul (> 300 km) — train or flight ──────────────────
        if (distanceKm < 800) {
            // Train is viable for < 800 km even for routine cases
            switch (level) {
                case "CRITICAL":
                    double flightHrs = distanceKm / 600.0 + 2.5;
                    return new TransportInfo("Flight", "✈️", flightHrs,
                            "Critical: Fly — fastest option (+2.5 hr airport overhead)", true);
                default:
                    double trainHrs = distanceKm / 80.0 + 1.0;
                    return new TransportInfo("Overnight Train", "🚆", trainHrs,
                            "Train or overnight express recommended (~80 km/h avg +1 hr)", true);
            }
        }

        // ── Zone 5: Very long haul (> 800 km) — flight only ─────────────────
        double flightHrs = distanceKm / 600.0 + 2.5;
        return new TransportInfo("Flight", "✈️", flightHrs,
                "Flight strongly recommended — only practical option (+2.5 hr airport overhead)", true);
    }


    // ───────────────────────────────────────────────
    // Haversine Formula — great-circle distance
    // ───────────────────────────────────────────────
    public double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ───────────────────────────────────────────────
    // AI Tradeoff Score — now uses realistic transport time
    // ───────────────────────────────────────────────
    /**
     * Calculates the AI compromise score.
     * Key change: travelHours now comes from getTransportInfo() (realistic modes)
     * instead of naive distanceKm / 60.
     *
     * Lower raw score = worse tradeoff. We invert it to 0-100 for display.
     */
    public double calculateScore(int waitDays, double distanceKm, String urgencyLevel,
                                String overrideMode, int yearsOfExperience, int avgMinutesPerPatient) {
        TransportInfo transport = getTransportInfo(distanceKm, urgencyLevel, overrideMode);
        double travelHours = transport.estimatedHours; // REALISTIC, not naive

        // Total effective time: wait (in days) + travel (converted to days)
        double tTotal = waitDays + (travelHours / 24.0);

        double wWait, wDist, wUrgency, penalty;

        switch (urgencyLevel.toUpperCase()) {
            case "URGENT":
                wWait = 0.5; wDist = 0.3; wUrgency = 0.2; penalty = 5.0;
                break;
            case "CRITICAL":
                wWait = 0.7; wDist = 0.1; wUrgency = 0.2; penalty = 10.0;
                break;
            case "ROUTINE":
            default:
                wWait = 0.3; wDist = 0.6; wUrgency = 0.1; penalty = 1.0;
                break;
        }

        double waitComp  = wWait    * tTotal;
        double distComp  = wDist    * (distanceKm / 100.0);
        double urgComp   = wUrgency * penalty * (tTotal / 7.0);

        double rawScore = waitComp + distComp + urgComp;

        // Apply AI bonus modifiers (reduce penalty = higher display score)
        double bonusMultiplier = 1.0;
        if (yearsOfExperience >= 15) {
            bonusMultiplier -= 0.10; // 10% better score for senior specialists
        }
        if (avgMinutesPerPatient > 0 && avgMinutesPerPatient <= 12) {
            bonusMultiplier -= 0.15; // 15% better score for fast-track doctors
        }

        return rawScore * bonusMultiplier;
    }
}
