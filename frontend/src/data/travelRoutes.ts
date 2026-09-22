export interface TravelLeg {
  mode: 'cab' | 'auto' | 'bus' | 'train' | 'metro' | 'walk' | 'flight' | 'shuttle';
  emoji: string;
  label: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMin: number;
  note?: string;
}

export interface TravelPlan {
  planLabel: string;
  planEmoji: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
  legs: TravelLeg[];
}

export interface CityPairRoutes {
  originCity: string;
  destinationState: string; // normalized lowercase
  destinationCity: string;
  plans: [TravelPlan, TravelPlan];
  /** Flight-only emergency plan for Critical urgency */
  criticalPlan: TravelPlan;
}

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─────────────────────────────────────────────────────────────
// ROUTE DATABASE
// ─────────────────────────────────────────────────────────────
const ROUTES: CityPairRoutes[] = [

  // ═══ Jodhpur → Delhi NCR ════════════════════════════════════
  {
    originCity: 'jodhpur',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 653,
      totalDurationMin: 150,
      estimatedCostMin: 3500,
      estimatedCostMax: 7000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Jodhpur)', to: 'Jodhpur Airport (JDH)', distanceKm: 10, durationMin: 20, note: 'Book immediately via Ola/Uber' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Jodhpur Airport (JDH)', to: 'IGI Airport Delhi (DEL)', distanceKm: 635, durationMin: 75, note: 'IndiGo / Air India — check real-time availability' },
        { mode: 'cab', emoji: '🚕', label: 'Airport Cab (Priority)', from: 'IGI Airport (DEL)', to: 'Hospital', distanceKm: 18, durationMin: 40, note: 'Use Uber Premier / Ola Prime for speed' },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 641,
        totalDurationMin: 570,
        estimatedCostMin: 900,
        estimatedCostMax: 1400,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab / Auto', from: 'Home (Jodhpur)', to: 'Jodhpur Railway Station', distanceKm: 8, durationMin: 20, note: 'Book via Ola/Uber' },
          { mode: 'train', emoji: '🚂', label: 'Mandore Express (Train)', from: 'Jodhpur Junction', to: 'Delhi Sarai Rohilla', distanceKm: 610, durationMin: 480, note: 'Departs ~8:00 PM, arrives ~4:00 AM' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro (Yellow Line)', from: 'Sarai Rohilla', to: 'AIIMS / Hospital Area', distanceKm: 18, durationMin: 35, note: 'Alight at AIIMS or nearest station' },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.4, durationMin: 6 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 643,
        totalDurationMin: 680,
        estimatedCostMin: 500,
        estimatedCostMax: 800,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto Rickshaw', from: 'Home (Jodhpur)', to: 'Jodhpur Bus Stand', distanceKm: 6, durationMin: 18 },
          { mode: 'bus', emoji: '🚌', label: 'RSRTC Volvo (Bus)', from: 'Jodhpur Bus Stand', to: 'Delhi ISBT Kashmere Gate', distanceKm: 615, durationMin: 570, note: 'Departs ~6:30 PM, arrives ~6:00 AM' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro (Red Line)', from: 'Kashmere Gate', to: 'AIIMS / Hospital Area', distanceKm: 20, durationMin: 45, note: 'Change at Central Secretariat' },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.4, durationMin: 6 },
        ],
      },
    ],
  },

  // ═══ Jodhpur → Tamil Nadu / Chennai ════════════════════════
  {
    originCity: 'jodhpur',
    destinationState: 'tamil nadu',
    destinationCity: 'Chennai',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 1780,
      totalDurationMin: 175,
      estimatedCostMin: 5000,
      estimatedCostMax: 12000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Jodhpur)', to: 'Jodhpur Airport (JDH)', distanceKm: 10, durationMin: 20, note: 'Book immediately' },
        { mode: 'flight', emoji: '✈️', label: 'Flight to Chennai', from: 'Jodhpur Airport (JDH)', to: 'Chennai Airport (MAA)', distanceKm: 1752, durationMin: 145, note: 'Via Mumbai or direct — check IndiGo / Air India' },
        { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport', to: 'Hospital Area', distanceKm: 15, durationMin: 28, note: 'Airport Metro Line to hospital' },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 1780,
        totalDurationMin: 203,
        estimatedCostMin: 4500,
        estimatedCostMax: 10000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Jodhpur)', to: 'Jodhpur Airport (JDH)', distanceKm: 10, durationMin: 25 },
          { mode: 'flight', emoji: '✈️', label: 'Flight to Chennai', from: 'Jodhpur Airport (JDH)', to: 'Chennai Airport (MAA)', distanceKm: 1752, durationMin: 145, note: 'Via Mumbai or Hyderabad — book IndiGo/Air India' },
          { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Hospital Nearby Station', distanceKm: 15, durationMin: 28 },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
        ],
      },
      {
        planLabel: 'Budget (Long)',
        planEmoji: '💰',
        totalDistanceKm: 1790,
        totalDurationMin: 1980,
        estimatedCostMin: 1000,
        estimatedCostMax: 1800,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto to Station', from: 'Home (Jodhpur)', to: 'Jodhpur Railway Station', distanceKm: 6, durationMin: 18 },
          { mode: 'train', emoji: '🚂', label: 'Train to Chennai', from: 'Jodhpur Junction', to: 'Chennai Central', distanceKm: 1765, durationMin: 1920, note: '~32h journey via Jaipur/Mumbai — check IRCTC' },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Chennai Central', to: 'Hospital OPD Gate', distanceKm: 12, durationMin: 30 },
        ],
      },
    ],
  },

  // ═══ Jaipur → Delhi NCR ═════════════════════════════════════
  {
    originCity: 'jaipur',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 280,
      totalDurationMin: 135,
      estimatedCostMin: 3000,
      estimatedCostMax: 6000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Jaipur)', to: 'Jaipur Airport (JAI)', distanceKm: 12, durationMin: 25, note: 'Book immediately' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Jaipur Airport (JAI)', to: 'IGI Airport Delhi (DEL)', distanceKm: 258, durationMin: 55, note: '~55 min flight, multiple daily' },
        { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28, note: 'Direct Airport Express' },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 2, durationMin: 8 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 282,
        totalDurationMin: 241,
        estimatedCostMin: 600,
        estimatedCostMax: 1000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Station', from: 'Home (Jaipur)', to: 'Jaipur Railway Station', distanceKm: 7, durationMin: 20 },
          { mode: 'train', emoji: '🚂', label: 'Shatabdi Express', from: 'Jaipur Junction', to: 'New Delhi Railway Station', distanceKm: 265, durationMin: 195, note: 'Departs 5:50 AM, arrives 10:35 AM' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro (Yellow Line)', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 10, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 285,
        totalDurationMin: 280,
        estimatedCostMin: 350,
        estimatedCostMax: 550,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto Rickshaw', from: 'Home (Jaipur)', to: 'Sindhi Camp Bus Stand', distanceKm: 5, durationMin: 15 },
          { mode: 'bus', emoji: '🚌', label: 'RSRTC AC Bus', from: 'Jaipur Sindhi Camp', to: 'Delhi ISBT Kashmere Gate', distanceKm: 270, durationMin: 240, note: 'Every 30 mins, ~4h journey' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'Kashmere Gate', to: 'Hospital Area', distanceKm: 18, durationMin: 35 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
    ],
  },

  // ═══ Jaipur → Tamil Nadu / Chennai ═════════════════════════
  {
    originCity: 'jaipur',
    destinationState: 'tamil nadu',
    destinationCity: 'Chennai',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 1760,
      totalDurationMin: 155,
      estimatedCostMin: 4500,
      estimatedCostMax: 10000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Jaipur)', to: 'Jaipur Airport (JAI)', distanceKm: 12, durationMin: 25, note: 'Book immediately' },
        { mode: 'flight', emoji: '✈️', label: 'Flight to Chennai', from: 'Jaipur Airport (JAI)', to: 'Chennai Airport (MAA)', distanceKm: 1735, durationMin: 130, note: 'Direct or via Hyderabad — IndiGo/Air India' },
        { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Hospital Nearby Station', distanceKm: 15, durationMin: 28 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 1760,
        totalDurationMin: 193,
        estimatedCostMin: 4000,
        estimatedCostMax: 9000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Jaipur)', to: 'Jaipur Airport (JAI)', distanceKm: 12, durationMin: 25 },
          { mode: 'flight', emoji: '✈️', label: 'Flight to Chennai', from: 'Jaipur Airport (JAI)', to: 'Chennai Airport (MAA)', distanceKm: 1735, durationMin: 130, note: 'IndiGo / Air India — check availability' },
          { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Nearest Hospital Station', distanceKm: 15, durationMin: 28 },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
        ],
      },
      {
        planLabel: 'Budget (Long)',
        planEmoji: '💰',
        totalDistanceKm: 1780,
        totalDurationMin: 1620,
        estimatedCostMin: 900,
        estimatedCostMax: 1600,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto to Station', from: 'Home (Jaipur)', to: 'Jaipur Railway Station', distanceKm: 5, durationMin: 15 },
          { mode: 'train', emoji: '🚂', label: 'Jaipur–Chennai Express', from: 'Jaipur Junction', to: 'Chennai Central', distanceKm: 1760, durationMin: 1560, note: '~26h journey — check IRCTC' },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Chennai Central', to: 'Hospital OPD Gate', distanceKm: 12, durationMin: 30 },
        ],
      },
    ],
  },

  // ═══ Kota → Delhi NCR ═══════════════════════════════════════
  {
    originCity: 'kota',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Fastest Route',
      planEmoji: '🚨',
      totalDistanceKm: 495,
      totalDurationMin: 315,
      estimatedCostMin: 700,
      estimatedCostMax: 1200,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Kota)', to: 'Kota Railway Station', distanceKm: 5, durationMin: 15, note: 'No airport at Kota — train is fastest' },
        { mode: 'train', emoji: '🚂', label: 'Rajdhani Express (Priority)', from: 'Kota Junction', to: 'New Delhi', distanceKm: 478, durationMin: 295, note: 'Book Tatkal — fastest available train' },
        { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 10, durationMin: 22 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 2, durationMin: 8 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 490,
        totalDurationMin: 330,
        estimatedCostMin: 700,
        estimatedCostMax: 1100,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab', from: 'Home (Kota)', to: 'Kota Railway Station', distanceKm: 5, durationMin: 15 },
          { mode: 'train', emoji: '🚂', label: 'Rajdhani Express', from: 'Kota Junction', to: 'New Delhi', distanceKm: 478, durationMin: 295, note: 'Fastest train — ~4h 55m' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 10, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 5 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 492,
        totalDurationMin: 400,
        estimatedCostMin: 380,
        estimatedCostMax: 600,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto', from: 'Home (Kota)', to: 'Kota Bus Stand', distanceKm: 4, durationMin: 12 },
          { mode: 'bus', emoji: '🚌', label: 'RSRTC Sleeper Bus', from: 'Kota Bus Stand', to: 'Delhi ISBT', distanceKm: 480, durationMin: 360, note: 'Overnight bus — 6h' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'Kashmere Gate', to: 'Hospital Area', distanceKm: 18, durationMin: 35 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 5 },
        ],
      },
    ],
  },

  // ═══ Ajmer → Delhi NCR ══════════════════════════════════════
  {
    originCity: 'ajmer',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Fastest Route',
      planEmoji: '🚨',
      totalDistanceKm: 398,
      totalDurationMin: 255,
      estimatedCostMin: 700,
      estimatedCostMax: 1100,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Ajmer)', to: 'Ajmer Railway Station', distanceKm: 4, durationMin: 12, note: 'No airport at Ajmer — train is fastest' },
        { mode: 'train', emoji: '🚂', label: 'Shatabdi / Express (Tatkal)', from: 'Ajmer Junction', to: 'New Delhi', distanceKm: 385, durationMin: 215, note: 'Book Tatkal on IRCTC now' },
        { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 10, durationMin: 22 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 2, durationMin: 8 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 395,
        totalDurationMin: 260,
        estimatedCostMin: 650,
        estimatedCostMax: 950,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab', from: 'Home (Ajmer)', to: 'Ajmer Railway Station', distanceKm: 4, durationMin: 12 },
          { mode: 'train', emoji: '🚂', label: 'Ajmer–Delhi Express', from: 'Ajmer Junction', to: 'New Delhi', distanceKm: 385, durationMin: 230 },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 10, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 5 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 396,
        totalDurationMin: 320,
        estimatedCostMin: 300,
        estimatedCostMax: 500,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto', from: 'Home (Ajmer)', to: 'Ajmer Bus Stand', distanceKm: 3, durationMin: 10 },
          { mode: 'bus', emoji: '🚌', label: 'RSRTC Bus', from: 'Ajmer Bus Stand', to: 'Delhi ISBT', distanceKm: 388, durationMin: 290 },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'Kashmere Gate', to: 'Hospital Area', distanceKm: 15, durationMin: 28 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 5 },
        ],
      },
    ],
  },

  // ═══ Udaipur → Delhi NCR ════════════════════════════════════
  {
    originCity: 'udaipur',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 692,
      totalDurationMin: 145,
      estimatedCostMin: 3500,
      estimatedCostMax: 7000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Udaipur)', to: 'Udaipur Airport (UDR)', distanceKm: 22, durationMin: 35, note: 'Book now — allow security time' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Udaipur Airport (UDR)', to: 'IGI Airport Delhi (DEL)', distanceKm: 652, durationMin: 70, note: '~1h 10m — IndiGo / Air India' },
        { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 2, durationMin: 8 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 680,
        totalDurationMin: 173,
        estimatedCostMin: 3500,
        estimatedCostMax: 6000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Udaipur)', to: 'Udaipur Airport (UDR)', distanceKm: 22, durationMin: 35 },
          { mode: 'flight', emoji: '✈️', label: 'Flight (IndiGo / Air India)', from: 'Udaipur Airport (UDR)', to: 'IGI Airport (DEL)', distanceKm: 650, durationMin: 70, note: '~1h 10m flight' },
          { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 5 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 668,
        totalDurationMin: 660,
        estimatedCostMin: 600,
        estimatedCostMax: 900,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto', from: 'Home (Udaipur)', to: 'Udaipur Railway Station', distanceKm: 5, durationMin: 15 },
          { mode: 'train', emoji: '🚂', label: 'Chetak Express', from: 'Udaipur City Station', to: 'New Delhi', distanceKm: 650, durationMin: 610, note: '~10h 10m' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 10, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 5 },
        ],
      },
    ],
  },

  // ═══ Mumbai → Delhi NCR ═════════════════════════════════════
  {
    originCity: 'mumbai',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 1440,
      totalDurationMin: 185,
      estimatedCostMin: 4000,
      estimatedCostMax: 8000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Mumbai)', to: 'Chhatrapati Shivaji Int. Airport', distanceKm: 20, durationMin: 45, note: 'Book immediately — Mumbai traffic heavy' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Mumbai Airport (BOM)', to: 'IGI Airport (DEL)', distanceKm: 1398, durationMin: 115, note: '~1h 55m — 30+ daily flights' },
        { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 2, durationMin: 8 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 1420,
        totalDurationMin: 196,
        estimatedCostMin: 4000,
        estimatedCostMax: 8000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Mumbai)', to: 'Chhatrapati Shivaji Int. Airport', distanceKm: 20, durationMin: 45 },
          { mode: 'flight', emoji: '✈️', label: 'Flight (IndiGo / Vistara)', from: 'Mumbai Airport (BOM)', to: 'IGI Airport (DEL)', distanceKm: 1398, durationMin: 115, note: '~1h 55m, multiple flights daily' },
          { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 1420,
        totalDurationMin: 960,
        estimatedCostMin: 800,
        estimatedCostMax: 1500,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Station', from: 'Home (Mumbai)', to: 'Mumbai Central Railway Station', distanceKm: 15, durationMin: 40 },
          { mode: 'train', emoji: '🚂', label: 'Rajdhani Express', from: 'Mumbai Central', to: 'New Delhi', distanceKm: 1390, durationMin: 880, note: '~15h 40m overnight' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 12, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
    ],
  },

  // ═══ Mumbai → Tamil Nadu / Chennai ════════════════════════
  {
    originCity: 'mumbai',
    destinationState: 'tamil nadu',
    destinationCity: 'Chennai',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 1340,
      totalDurationMin: 180,
      estimatedCostMin: 3500,
      estimatedCostMax: 8000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Mumbai)', to: 'Chhatrapati Shivaji Int. Airport', distanceKm: 20, durationMin: 45, note: 'Book immediately' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Mumbai Airport (BOM)', to: 'Chennai Airport (MAA)', distanceKm: 1302, durationMin: 110, note: '~1h 50m — multiple daily flights' },
        { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Nearest Hospital Station', distanceKm: 15, durationMin: 28 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 1340,
        totalDurationMin: 193,
        estimatedCostMin: 3500,
        estimatedCostMax: 7500,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Mumbai)', to: 'Chhatrapati Shivaji Airport', distanceKm: 20, durationMin: 45 },
          { mode: 'flight', emoji: '✈️', label: 'Flight to Chennai', from: 'Mumbai Airport (BOM)', to: 'Chennai Airport (MAA)', distanceKm: 1302, durationMin: 110, note: '~1h 50m — IndiGo/Air India/Vistara' },
          { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Hospital Station', distanceKm: 15, durationMin: 28 },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 1345,
        totalDurationMin: 780,
        estimatedCostMin: 900,
        estimatedCostMax: 1600,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Station', from: 'Home (Mumbai)', to: 'Mumbai CSMT / LTT Station', distanceKm: 15, durationMin: 35 },
          { mode: 'train', emoji: '🚂', label: 'Mumbai–Chennai Express', from: 'Mumbai LTT', to: 'Chennai Central', distanceKm: 1316, durationMin: 720, note: '~12h overnight journey' },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Chennai Central', to: 'Hospital OPD Gate', distanceKm: 12, durationMin: 30 },
        ],
      },
    ],
  },

  // ═══ Bangalore → Delhi NCR ══════════════════════════════════
  {
    originCity: 'bangalore',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 2120,
      totalDurationMin: 243,
      estimatedCostMin: 4500,
      estimatedCostMax: 9000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Bangalore)', to: 'Kempegowda International Airport', distanceKm: 38, durationMin: 60, note: 'Allow 45-60 min for traffic' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Bangalore Airport (BLR)', to: 'IGI Airport Delhi (DEL)', distanceKm: 2060, durationMin: 155, note: '~2h 35m — many daily flights' },
        { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 2100,
        totalDurationMin: 247,
        estimatedCostMin: 4500,
        estimatedCostMax: 9000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Bangalore)', to: 'Kempegowda International Airport', distanceKm: 38, durationMin: 60, note: 'Allow ~45-60 min for traffic' },
          { mode: 'flight', emoji: '✈️', label: 'Flight (IndiGo / SpiceJet)', from: 'Bangalore Airport (BLR)', to: 'IGI Airport (DEL)', distanceKm: 2060, durationMin: 155, note: '~2h 35m, multiple daily flights' },
          { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 2100,
        totalDurationMin: 278,
        estimatedCostMin: 2500,
        estimatedCostMax: 4000,
        legs: [
          { mode: 'bus', emoji: '🚌', label: 'BMTC Airport Bus (Vayu Vajra)', from: 'Home (Bangalore)', to: 'Kempegowda Int. Airport', distanceKm: 38, durationMin: 90, note: 'Cheaper than cab, runs every 30 min' },
          { mode: 'flight', emoji: '✈️', label: 'Budget Airline Flight', from: 'Bangalore Airport (BLR)', to: 'IGI Airport (DEL)', distanceKm: 2060, durationMin: 160, note: 'Book 2+ weeks ahead for cheapest fares' },
          { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
        ],
      },
    ],
  },

  // ═══ Bangalore → Tamil Nadu / Chennai ═════════════════════
  {
    originCity: 'bangalore',
    destinationState: 'tamil nadu',
    destinationCity: 'Chennai',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Fastest Route',
      planEmoji: '🚨',
      totalDistanceKm: 350,
      totalDurationMin: 185,
      estimatedCostMin: 2500,
      estimatedCostMax: 5000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab (Fastest)', from: 'Home (Bangalore)', to: 'Chennai Hospital', distanceKm: 346, durationMin: 180, note: 'Direct cab — 3h drive via NH44, faster than flight for this distance' },
        { mode: 'walk', emoji: '🚶', label: 'Enter Hospital', from: 'Drop-off Point', to: 'Hospital OPD Gate', distanceKm: 0.2, durationMin: 3 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 350,
        totalDurationMin: 210,
        estimatedCostMin: 2000,
        estimatedCostMax: 4000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab / Ola Outstation', from: 'Home (Bangalore)', to: 'Chennai Hospital', distanceKm: 346, durationMin: 180, note: 'Via NH44 — ~3h direct drive' },
          { mode: 'walk', emoji: '🚶', label: 'Enter Hospital', from: 'Drop-off', to: 'Hospital OPD Gate', distanceKm: 0.2, durationMin: 3 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 350,
        totalDurationMin: 330,
        estimatedCostMin: 300,
        estimatedCostMax: 600,
        legs: [
          { mode: 'metro', emoji: '🚇', label: 'Metro / Cab to Bus Stand', from: 'Home (Bangalore)', to: 'Majestic / Satellite Bus Stand', distanceKm: 15, durationMin: 40 },
          { mode: 'bus', emoji: '🚌', label: 'KSRTC / SETC Volvo', from: 'Bangalore Majestic', to: 'Chennai CMBT', distanceKm: 330, durationMin: 360, note: '~6h, hourly departures' },
          { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'CMBT', to: 'Hospital Nearby Station', distanceKm: 12, durationMin: 25 },
          { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
        ],
      },
    ],
  },

  // ═══ Chennai → Delhi NCR ════════════════════════════════════
  {
    originCity: 'chennai',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 2220,
      totalDurationMin: 225,
      estimatedCostMin: 4500,
      estimatedCostMax: 9000,
      legs: [
        { mode: 'metro', emoji: '🚇', label: 'Metro to Airport', from: 'Home (Chennai)', to: 'Chennai Airport Station', distanceKm: 15, durationMin: 32, note: 'Or book cab if far from metro' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Chennai Airport (MAA)', to: 'IGI Airport (DEL)', distanceKm: 2180, durationMin: 165, note: '~2h 45m — multiple daily' },
        { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 2200,
        totalDurationMin: 225,
        estimatedCostMin: 4500,
        estimatedCostMax: 8500,
        legs: [
          { mode: 'metro', emoji: '🚇', label: 'Chennai Metro to Airport', from: 'Home (Chennai)', to: 'Chennai Airport Station', distanceKm: 15, durationMin: 30 },
          { mode: 'flight', emoji: '✈️', label: 'Flight (IndiGo / Air India)', from: 'Chennai Airport (MAA)', to: 'IGI Airport (DEL)', distanceKm: 2180, durationMin: 165, note: '~2h 45m, direct flights' },
          { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 2200,
        totalDurationMin: 1980,
        estimatedCostMin: 1200,
        estimatedCostMax: 2000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Station', from: 'Home (Chennai)', to: 'Chennai Central', distanceKm: 8, durationMin: 20 },
          { mode: 'train', emoji: '🚂', label: 'Grand Trunk Express', from: 'Chennai Central', to: 'New Delhi', distanceKm: 2185, durationMin: 1920, note: '~32h — 2nd AC recommended' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 12, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
    ],
  },

  // ═══ Pune → Delhi NCR ═══════════════════════════════════════
  {
    originCity: 'pune',
    destinationState: 'delhi ncr',
    destinationCity: 'New Delhi',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 1500,
      totalDurationMin: 187,
      estimatedCostMin: 3500,
      estimatedCostMax: 7000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Emergency Cab', from: 'Home (Pune)', to: 'Pune International Airport', distanceKm: 10, durationMin: 25, note: 'Book immediately' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'Pune Airport (PNQ)', to: 'IGI Airport (DEL)', distanceKm: 1464, durationMin: 130, note: '~2h 10m' },
        { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 2, durationMin: 8 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 1480,
        totalDurationMin: 187,
        estimatedCostMin: 3500,
        estimatedCostMax: 7000,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Airport', from: 'Home (Pune)', to: 'Pune International Airport', distanceKm: 10, durationMin: 25 },
          { mode: 'flight', emoji: '✈️', label: 'Flight (IndiGo / Air India)', from: 'Pune Airport (PNQ)', to: 'IGI Airport (DEL)', distanceKm: 1464, durationMin: 130, note: '~2h 10m flight' },
          { mode: 'metro', emoji: '🚇', label: 'Airport Express Metro', from: 'IGI Airport', to: 'Hospital Area', distanceKm: 18, durationMin: 28 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 1480,
        totalDurationMin: 1020,
        estimatedCostMin: 900,
        estimatedCostMax: 1600,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Station', from: 'Home (Pune)', to: 'Pune Railway Station', distanceKm: 8, durationMin: 20 },
          { mode: 'train', emoji: '🚂', label: 'Duronto Express', from: 'Pune Junction', to: 'New Delhi', distanceKm: 1456, durationMin: 960, note: '~16h overnight' },
          { mode: 'metro', emoji: '🚇', label: 'Delhi Metro', from: 'New Delhi Rly Station', to: 'Hospital Area', distanceKm: 12, durationMin: 22 },
          { mode: 'walk', emoji: '🚶', label: 'Walk to OPD', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 0.3, durationMin: 4 },
        ],
      },
    ],
  },

  // ═══ New Delhi / Delhi → Tamil Nadu / Chennai ══════════════
  {
    originCity: 'new delhi',
    destinationState: 'tamil nadu',
    destinationCity: 'Chennai',
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Flight Only',
      planEmoji: '🚨',
      totalDistanceKm: 2200,
      totalDurationMin: 222,
      estimatedCostMin: 4500,
      estimatedCostMax: 9000,
      legs: [
        { mode: 'metro', emoji: '🚇', label: 'Metro to Airport', from: 'Home (Delhi)', to: 'IGI Airport (DEL)', distanceKm: 18, durationMin: 30, note: 'Airport Express Line — fastest' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: 'IGI Airport (DEL)', to: 'Chennai Airport (MAA)', distanceKm: 2180, durationMin: 165, note: '~2h 45m — multiple daily' },
        { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Nearest Hospital Station', distanceKm: 15, durationMin: 28 },
        { mode: 'cab', emoji: '🚕', label: 'Last-mile Cab', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 2200,
        totalDurationMin: 233,
        estimatedCostMin: 4000,
        estimatedCostMax: 8500,
        legs: [
          { mode: 'metro', emoji: '🚇', label: 'Metro to Airport', from: 'Home (Delhi)', to: 'IGI Airport', distanceKm: 18, durationMin: 30, note: 'Airport Express Line' },
          { mode: 'flight', emoji: '✈️', label: 'Flight to Chennai', from: 'IGI Airport (DEL)', to: 'Chennai Airport (MAA)', distanceKm: 2180, durationMin: 165, note: '~2h 45m' },
          { mode: 'metro', emoji: '🚇', label: 'Chennai Metro', from: 'Chennai Airport Station', to: 'Hospital Nearby Station', distanceKm: 15, durationMin: 28 },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Metro Station', to: 'Hospital OPD Gate', distanceKm: 3, durationMin: 10 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 2185,
        totalDurationMin: 1980,
        estimatedCostMin: 1200,
        estimatedCostMax: 2200,
        legs: [
          { mode: 'metro', emoji: '🚇', label: 'Metro to Station', from: 'Home (Delhi)', to: 'New Delhi Railway Station', distanceKm: 10, durationMin: 20 },
          { mode: 'train', emoji: '🚂', label: 'Grand Trunk Express', from: 'New Delhi Station', to: 'Chennai Central', distanceKm: 2185, durationMin: 1920, note: '~32h, book 2AC' },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: 'Chennai Central', to: 'Hospital OPD Gate', distanceKm: 12, durationMin: 30 },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// FALLBACK — for unknown city pairs
// ─────────────────────────────────────────────────────────────
function getFallbackPlans(originCity: string, destState: string): CityPairRoutes {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const origin = cap(originCity);
  const dest = cap(destState);
  return {
    originCity,
    destinationState: destState,
    destinationCity: dest,
    criticalPlan: {
      planLabel: '🚨 EMERGENCY — Fastest Option',
      planEmoji: '🚨',
      totalDistanceKm: 800,
      totalDurationMin: 210,
      estimatedCostMin: 4000,
      estimatedCostMax: 9000,
      legs: [
        { mode: 'cab', emoji: '🚕', label: 'Cab to Nearest Airport', from: `Home (${origin})`, to: 'Nearest Airport', distanceKm: 20, durationMin: 35, note: 'Check Google Maps for your nearest airport' },
        { mode: 'flight', emoji: '✈️', label: 'First Available Flight', from: `${origin} Airport`, to: `${dest} Airport`, distanceKm: 750, durationMin: 120, note: 'Book immediately on MakeMyTrip / IRCTC Air' },
        { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: `${dest} Airport`, to: 'Hospital OPD Gate', distanceKm: 20, durationMin: 40 },
      ],
    },
    plans: [
      {
        planLabel: 'Fastest',
        planEmoji: '⚡',
        totalDistanceKm: 800,
        totalDurationMin: 310,
        estimatedCostMin: 1000,
        estimatedCostMax: 2500,
        legs: [
          { mode: 'cab', emoji: '🚕', label: 'Cab to Station / Airport', from: `Home (${origin})`, to: 'Nearest Transport Hub', distanceKm: 15, durationMin: 30 },
          { mode: 'train', emoji: '🚂', label: 'Express Train', from: `${origin} Station`, to: `${dest} Station`, distanceKm: 760, durationMin: 240, note: 'Check IRCTC for trains' },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: `${dest} Station`, to: 'Hospital OPD Gate', distanceKm: 12, durationMin: 30 },
        ],
      },
      {
        planLabel: 'Budget',
        planEmoji: '💰',
        totalDistanceKm: 800,
        totalDurationMin: 420,
        estimatedCostMin: 400,
        estimatedCostMax: 900,
        legs: [
          { mode: 'auto', emoji: '🛺', label: 'Auto to Bus Stand', from: `Home (${origin})`, to: 'Nearest Bus Stand', distanceKm: 8, durationMin: 20 },
          { mode: 'bus', emoji: '🚌', label: 'State Bus', from: `${origin} Bus Stand`, to: `${dest}`, distanceKm: 775, durationMin: 360, note: 'Check state transport operator' },
          { mode: 'cab', emoji: '🚕', label: 'Cab to Hospital', from: `${dest} Bus Stand`, to: 'Hospital OPD Gate', distanceKm: 10, durationMin: 25 },
        ],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// LOOKUP FUNCTION — strict matching only, no wrong partial match
// ─────────────────────────────────────────────────────────────
function findRoute(originCity: string, destinationState: string): CityPairRoutes | null {
  const normOrigin = normalize(originCity);
  const normDest = normalize(destinationState);

  // 1. Exact match on both
  const exact = ROUTES.find(
    r => normalize(r.originCity) === normOrigin && normalize(r.destinationState) === normDest
  );
  if (exact) return exact;

  // 2. Origin aliases (e.g. "delhi" matches "new delhi")
  const ORIGIN_ALIASES: Record<string, string> = {
    'delhi': 'new delhi',
    'gurgaon': 'new delhi',
    'noida': 'new delhi',
    'bengaluru': 'bangalore',
    'mysore': 'bangalore',
    'coimbatore': 'chennai',
    'madurai': 'chennai',
    'nagpur': 'mumbai',
    'thane': 'mumbai',
    'nashik': 'mumbai',
  };
  const aliasedOrigin = ALIAS_DEST[normOrigin] ?? ORIGIN_ALIASES[normOrigin] ?? normOrigin;

  const aliasMatch = ROUTES.find(
    r => normalize(r.originCity) === aliasedOrigin && normalize(r.destinationState) === normDest
  );
  if (aliasMatch) return aliasMatch;

  // 3. Destination aliases
  const DEST_ALIASES: Record<string, string> = {
    'rajasthan': 'delhi ncr',  // fallback for within-state
    'karnataka': 'tamil nadu', // not ideal but better than wrong match
  };
  const aliasedDest = ALIAS_DEST[normDest] ?? DEST_ALIASES[normDest];
  if (aliasedDest) {
    const destAliasMatch = ROUTES.find(
      r => normalize(r.originCity) === normOrigin && normalize(r.destinationState) === aliasedDest
    );
    if (destAliasMatch) return destAliasMatch;
  }

  return null; // return null so caller can use clean fallback
}

// secondary alias map (dest-side state → normalized)
const ALIAS_DEST: Record<string, string> = {};

/**
 * Get travel plans for a city pair.
 * urgencyScore 10 = Critical, 5 = Urgent, 1 = Routine
 */
export function getTravelPlans(
  originCity: string,
  destinationState: string,
  urgencyScore = 1
): { plans: [TravelPlan, TravelPlan]; criticalPlan: TravelPlan; isCritical: boolean } {
  const noCity = !originCity;
  const route = noCity ? null : findRoute(originCity, destinationState);
  const data = route ?? getFallbackPlans(originCity || 'Your City', destinationState);

  return {
    plans: data.plans,
    criticalPlan: data.criticalPlan,
    isCritical: urgencyScore >= 10,
  };
}

/** Format minutes to "9h 30m" or "45 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
