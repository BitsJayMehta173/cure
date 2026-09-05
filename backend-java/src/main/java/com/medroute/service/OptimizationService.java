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

    // Practical minimum distance for a commercial scheduled flight (India context).
    // Below this, drive/train always beats flight door-to-door even in CRITICAL cases.
    // Real-world: even shortest commercial routes in India are 200+ km, and the
    // 2.5 hr airport overhead dominates below this threshold.
    public static final double FLIGHT_MIN_DISTANCE_KM = 200.0;

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
     *   < 15 km          → Auto/Cab                (~20 km/h)
     *   15–50 km         → City Bus/Cab            (~30 km/h)
     *   50–200 km        → Bus/Train based on urgency
     *   200–500 km       → Train always; Flight for CRITICAL (airport overhead pays off)
     *   500–800 km       → Train for routine/urgent; Flight for CRITICAL
     *   > 800 km         → Flight always
     */
    public TransportInfo getTransportInfo(double distanceKm, String urgencyLevel, String overrideMode) {
        String level = urgencyLevel.toUpperCase();
        String mode = overrideMode != null ? overrideMode.trim().toLowerCase() : "";

        if (!mode.isEmpty() && !mode.equals("ai")) {

            // Intelligent Fallback: Prevent absurd travel modes for extreme distances
            // Below FLIGHT_MIN_DISTANCE_KM (200 km), flight is impractical — too close
            // to drive/train. Door-to-door is worse than ground transport.
            if (mode.equals("flight") && distanceKm < FLIGHT_MIN_DISTANCE_KM) {
                TransportInfo fallback = getTransportInfo(distanceKm, urgencyLevel, "ai");
                return new TransportInfo(fallback.mode, fallback.emoji, fallback.estimatedHours,
                        "Flight impractical under " + (int) FLIGHT_MIN_DISTANCE_KM + " km (airport overhead too high). Downgraded to " + fallback.mode, fallback.isLongDistance);
            }
            if (mode.equals("train") && distanceKm < 50) {
                TransportInfo fallback = getTransportInfo(distanceKm, urgencyLevel, "ai");
                return new TransportInfo(fallback.mode, fallback.emoji, fallback.estimatedHours,
                        "Train impractical for local travel. Downgraded to " + fallback.mode, fallback.isLongDistance);
            }
            if ((mode.equals("bike/auto") || mode.equals("bus")) && distanceKm > 800) {
                TransportInfo fallback = getTransportInfo(distanceKm, urgencyLevel, "ai");
                return new TransportInfo(fallback.mode, fallback.emoji, fallback.estimatedHours,
                        "Too far for local transit. Upgraded to " + fallback.mode, fallback.isLongDistance);
            }

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

        // ── Zone 3: Regional (50–200 km) — bus or train based on urgency ──
        // Flight still impractical here — even shortest scheduled routes are 200+ km,
        // and 2.5 hr airport overhead exceeds any time saved vs train/bus.
        if (distanceKm < FLIGHT_MIN_DISTANCE_KM) {
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

        // ── Zone 4: Medium-haul (200–500 km) — flight viable for CRITICAL ──
        // Door-to-door comparison at 237 km CRITICAL:
        //   Flight: 237/600 + 2.5 hr overhead = 2.9 hr
        //   Train:  237/80 + 0.5 hr boarding  = 3.5 hr  → flight wins by 35 min
        if (distanceKm < 500) {
            if (level.equals("CRITICAL")) {
                double flightHrs = distanceKm / 600.0 + 2.5;
                return new TransportInfo("Flight", "✈️", flightHrs,
                        "Critical: Flying saves ~1 hr vs train at this distance (incl. 2.5 hr airport time)", true);
            }
            // Urgent / Routine → train still wins
            double trainHrs = distanceKm / 80.0 + 0.5;
            return new TransportInfo("Express Train", "🚄", trainHrs,
                    "Express train — fast & reliable at this distance (+30 min boarding)", true);
        }

        // ── Zone 5: Long haul (500–800 km) — train/flight split by urgency ─
        if (distanceKm < 800) {
            switch (level) {
                case "CRITICAL":
                case "URGENT":
                    double flightHrs = distanceKm / 600.0 + 2.5;
                    return new TransportInfo("Flight", "✈️", flightHrs,
                            "Critical: Fly — fastest option (+2.5 hr airport overhead)", true);
                default:
                    double trainHrs = distanceKm / 80.0 + 1.0;
                    return new TransportInfo("Overnight Train", "🚆", trainHrs,
                            "Train or overnight express recommended (~80 km/h avg +1 hr)", true);
            }
        }

        // ── Zone 6: Very long haul (> 800 km) — flight always wins ─────────
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
        double travelHours = transport.estimatedHours;

        // ML feature: realistic round trip (uses the *chosen* transport, not a flat
        // 4-hr baseline). Round-trip = there + back + on-site consult time.
        double totalRoundTripHrs = (travelHours * 2) + (avgMinutesPerPatient / 60.0);
        if (travelHours > 12) totalRoundTripHrs += 12; // Overnight penalty

        // ML feature: financial cost indexed to the transport mode & distance band.
        // Aligned with the new zone boundaries (FLIGHT_MIN_DISTANCE_KM = 200).
        double financialCostIndex = 50.0;
        if (distanceKm < 50) {
            financialCostIndex = 10.0;            // Auto / cab
        } else if (distanceKm < 200) {
            financialCostIndex = 30.0;            // Bus / train
        } else if (distanceKm < 500) {
            // Train dominates; flight only when CRITICAL
            financialCostIndex = transport.mode.startsWith("Flight") ? 70.0 : 45.0;
        } else if (distanceKm < 800) {
            financialCostIndex = transport.mode.startsWith("Flight") ? 80.0 : 55.0;
        } else {
            financialCostIndex = 90.0;            // Flight-dominated
        }

        // ML feature: transport-mode one-hot so the network can learn that
        // "Flight + Critical + 237 km" is a *good* combo, not just a penalty.
        // 0=Auto, 1=Bus, 2=Train, 3=ExpressTrain, 4=Flight
        int transportModeCode = 0;
        if (transport.mode.contains("Bus")) transportModeCode = 1;
        else if (transport.mode.contains("Express")) transportModeCode = 3;
        else if (transport.mode.contains("Train")) transportModeCode = 2;
        else if (transport.mode.contains("Flight")) transportModeCode = 4;

        // ML feature: 1 when AI picked flight for this row, 0 otherwise.
        // Lets the model reinforce the rule that flight is good when critical
        // even at 200-300 km where the door-to-door math is borderline.
        int flightViableFlag = (transportModeCode == 4) ? 1 : 0;

        double doctorRating = 4.5; // Default for now
        int hospitalTier = 2; // Default for now

        // Attempt to call the Python PyTorch Neural Network Microservice
        try {
            int urgencyInt = 1;
            if (urgencyLevel.equalsIgnoreCase("URGENT")) urgencyInt = 5;
            else if (urgencyLevel.equalsIgnoreCase("CRITICAL")) urgencyInt = 10;

            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            String json = String.format(java.util.Locale.US,
                "[{\"urgency\":%d, \"wait_days\":%d, \"distance_km\":%f, \"exp_years\":%d, " +
                "\"queue_speed_mins\":%d, \"financial_cost_index\":%f, \"total_round_trip_hrs\":%f, " +
                "\"doctor_rating\":%f, \"hospital_tier\":%d, \"transport_mode\":%d, \"flight_viable\":%d}]",
                urgencyInt, waitDays, distanceKm, yearsOfExperience, avgMinutesPerPatient,
                financialCostIndex, totalRoundTripHrs, doctorRating, hospitalTier,
                transportModeCode, flightViableFlag);

            org.springframework.http.HttpEntity<String> request = new org.springframework.http.HttpEntity<>(json, headers);
            Double[] result = restTemplate.postForObject("http://127.0.0.1:5000/api/predict", request, Double[].class);

            if (result != null && result.length > 0) {
                // The PyTorch Model returns 0-100 directly.
                // SearchController converts our output using: displayScore = 100 - (score * 5)
                // We reverse the math here to perfectly match the controller:
                return (100.0 - result[0]) / 5.0;
            }
        } catch (Exception e) {
            System.err.println("ML Service unavailable, falling back to heuristic constraint engine: " + e.getMessage());
        }


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
