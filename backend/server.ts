import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// --- 🧠 SCORING ENGINE (From Diagram) ---
// Formula: score = w1 * wait_norm + w2 * dist_norm + w3 * urgency_mult
const calculateMatchScores = (slots: any[], urgencyScore: number) => {
  if (slots.length === 0) return [];

  // 1. Find Max values for normalization
  const maxWait = Math.max(...slots.map(s => s.estimated_wait_mins), 1);
  const maxDist = Math.max(...slots.map(s => s.distance_km || 1), 1);

  // 2. Weights (Phase 1 Configurable Weights)
  const W_WAIT = 0.4;
  const W_DIST = 0.4;
  let W_URGENCY = 0.2;

  // Urgency Multiplier (1.0x to 3.0x based on 1-10 severity)
  const urgencyMultiplier = 1.0 + ((urgencyScore - 1) / 9) * 2.0;

  // Override for Critical cases
  if (urgencyScore >= 8) {
    W_URGENCY = 0.5; // Heavier weight on getting them in immediately
  }

  // 3. Scoring
  return slots.map(slot => {
    // Note: For wait and distance, LOWER is better. So we invert the normalized score for ranking.
    // Higher score = better match.
    const waitNorm = 1 - (slot.estimated_wait_mins / maxWait);
    const distNorm = 1 - ((slot.distance_km || 1) / maxDist);
    
    const finalScore = (W_WAIT * waitNorm) + (W_DIST * distNorm) + (W_URGENCY * urgencyMultiplier);

    // Assign Trade-off labels based on relative scores
    let tradeoffLabel = 'Standard Option';
    if (waitNorm > 0.8 && distNorm < 0.3) tradeoffLabel = 'Fastest: Long Travel';
    if (distNorm > 0.8 && waitNorm < 0.3) tradeoffLabel = 'Nearest: Long Wait';
    if (urgencyScore >= 8 && finalScore > 0.8) tradeoffLabel = '🚨 AI Critical Compromise';

    return {
      ...slot,
      score: finalScore,
      tradeoffLabel
    };
  }).sort((a, b) => b.score - a.score); // Descending order (highest score first)
};


// --- API ROUTES (Core Services) ---

// Step 2 & 3: Search & Filter + Matching Engine
app.get('/api/search', async (req, res) => {
  const { specialty, urgency = '1', lat, lng } = req.query;
  
  try {
    // 1. Fetch available slots matching specialty
    const availableSlots = await prisma.availabilitySlot.findMany({
      where: {
        status: 'AVAILABLE',
        doctor: { specialty: String(specialty) }
      },
      include: {
        doctor: true,
        facility: true
      }
    });

    // 2. Mock Distance Calculation (Normally Maps API)
    // Here we generate a pseudo-random distance for demo purposes since we don't have real coordinates setup
    const slotsWithDistance = availableSlots.map(slot => ({
      ...slot,
      distance_km: Math.floor(Math.random() * 50) + 1 // 1km to 50km
    }));

    // 3. Apply Scoring Engine
    const rankedResults = calculateMatchScores(slotsWithDistance, Number(urgency));
    
    res.json({ success: true, data: rankedResults });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Matching Engine Failure' });
  }
});

// Step 6: Booking Service
app.post('/api/book', async (req, res) => {
  const { patient_id, slot_id, urgency_level, score_at_booking } = req.body;
  try {
    // Lock Slot (Optimistic Reserve)
    const slot = await prisma.availabilitySlot.update({
      where: { slot_id },
      data: { status: 'BOOKED' }
    });

    const booking = await prisma.booking.create({
      data: {
        patient_id,
        slot_id,
        urgency_level,
        score_at_booking: Number(score_at_booking),
        status: 'CONFIRMED'
      }
    });
    
    res.json({ success: true, booking, message: '✅ Appointment Confirmed (UPI Processed)' });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Slot locking failed - Rematch needed.' });
  }
});


// --- ⚙️ BACKGROUND - REAL-TIME SIMULATOR ---
// Periodically updates queue times and injects failures
const startSimulator = () => {
  console.log("⚙️ Real-time Simulator Started...");
  
  setInterval(async () => {
    try {
      // 1. Tick down wait times for AVAILABLE slots
      await prisma.$executeRaw`UPDATE AvailabilitySlot SET estimated_wait_mins = MAX(0, estimated_wait_mins - 5) WHERE status = 'AVAILABLE'`;
      
      // 2. Inject Failure Modes (10% chance to cancel a booked slot to trigger Rematching)
      const randomTrigger = Math.random();
      if (randomTrigger > 0.90) {
        const bookedSlots = await prisma.availabilitySlot.findMany({ where: { status: 'BOOKED' } });
        if (bookedSlots.length > 0) {
          const slotToFail = bookedSlots[Math.floor(Math.random() * bookedSlots.length)];
          
          await prisma.availabilitySlot.update({
            where: { slot_id: slotToFail.slot_id },
            data: { status: 'CANCELLED' } // Doctor emergency, etc.
          });

          await prisma.booking.updateMany({
            where: { slot_id: slotToFail.slot_id, status: 'CONFIRMED' },
            data: { status: 'CANCELLED_BY_FACILITY' }
          });
          console.log(`🚨 Simulator Injected Failure: Slot ${slotToFail.slot_id} cancelled! Rematch engine notified.`);
        }
      }
    } catch (e) {
      console.error("Simulator Tick Error:", e);
    }
  }, 10000); // Tick every 10 seconds for demo purposes
};

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Core Services running on http://localhost:${PORT}`);
  startSimulator();
});
