"""
Generate 11-feature synthetic training data with labels produced by the SAME
rule-based engine used in OptimizationService.java. This ensures the neural
network learns the transport-mode-aware scoring the Java side is computing.

Schema (11 features + 1 label):
  urgency                (1=routine, 5=urgent, 10=critical)
  wait_days              (0-30)
  distance_km            (0-3000)
  exp_years              (1-40)
  queue_speed_mins       (5-45)
  financial_cost_index   (0-100, computed from distance+mode)
  total_round_trip_hrs   (computed from distance+mode)
  doctor_rating          (2.5-5.0)
  hospital_tier          (1, 2, or 3)
  transport_mode         (0=Auto, 1=Bus, 2=Train, 3=ExpressTrain, 4=Flight)
  flight_viable          (0 or 1)
  optimal_score          (0-100, label)
"""
import numpy as np
import pandas as pd

np.random.seed(42)

NUM_SAMPLES = 150000  # bigger than the old 100k to cover new mode bins

# --- 1. Sample raw inputs -------------------------------------------------
urgency_levels = [1, 5, 10]
data = {
    'urgency': np.random.choice(urgency_levels, NUM_SAMPLES),
    'wait_days': np.random.randint(0, 31, NUM_SAMPLES),
    'distance_km': np.random.exponential(scale=350, size=NUM_SAMPLES).clip(0, 3000),
    'exp_years': np.random.randint(1, 41, NUM_SAMPLES),
    'queue_speed_mins': np.random.randint(5, 46, NUM_SAMPLES),
    'doctor_rating': np.random.uniform(2.5, 5.0, NUM_SAMPLES).round(2),
    'hospital_tier': np.random.choice([1, 2, 3], NUM_SAMPLES, p=[0.2, 0.5, 0.3])
}
df = pd.DataFrame(data)


# --- 2. Replicate the Java zone logic -------------------------------------
# Mirrors OptimizationService.getTransportInfo()
FLIGHT_MIN_DISTANCE_KM = 200.0


def pick_transport(distance_km, urgency_int):
    """Return (mode_code, travel_hrs_one_way, mode_name)."""
    if distance_km < 15:
        return 0, distance_km / 20.0, "Auto"
    if distance_km < 50:
        return 1, distance_km / 30.0, "Bus"
    if distance_km < FLIGHT_MIN_DISTANCE_KM:
        if urgency_int == 10:
            return 3, distance_km / 80.0 + 0.5, "ExpressTrain"
        if urgency_int == 5:
            return 2, distance_km / 70.0 + 0.5, "Train"
        return 1, distance_km / 50.0, "Bus"
    if distance_km < 500:
        if urgency_int == 10:
            return 4, distance_km / 600.0 + 2.5, "Flight"
        return 3, distance_km / 80.0 + 0.5, "ExpressTrain"
    if distance_km < 800:
        if urgency_int in (5, 10):
            return 4, distance_km / 600.0 + 2.5, "Flight"
        return 2, distance_km / 80.0 + 1.0, "Train"
    return 4, distance_km / 600.0 + 2.5, "Flight"


# --- 3. Compute derived features per row ---------------------------------
def derive(row):
    d = row['distance_km']
    u = row['urgency']
    spd = row['queue_speed_mins']

    mode_code, travel_hrs_one_way, mode_name = pick_transport(d, u)

    # Round-trip hours
    round_trip_hrs = (travel_hrs_one_way * 2) + (spd / 60.0)
    if travel_hrs_one_way > 12:
        round_trip_hrs += 12  # overnight penalty

    # Financial cost index (matches the new zone-aware version in Java)
    if d < 50:
        cost = np.random.uniform(1, 10)
    elif d < 200:
        cost = np.random.uniform(10, 30)
    elif d < 500:
        cost = 70.0 if mode_name == "Flight" else np.random.uniform(30, 45)
    elif d < 800:
        cost = 80.0 if mode_name == "Flight" else np.random.uniform(40, 55)
    else:
        cost = 90.0

    if travel_hrs_one_way > 12:
        cost = min(100, cost + 20)

    flight_viable = 1 if mode_name == "Flight" else 0

    return pd.Series([cost, round_trip_hrs, mode_code, flight_viable])


print("Computing 11 features (incl. transport_mode, flight_viable)...")
df[['financial_cost_index', 'total_round_trip_hrs', 'transport_mode', 'flight_viable']] = (
    df.apply(derive, axis=1)
)


# --- 4. Oracle label (same shape as the old generator, plus mode signals) -
def label(row):
    u = row['urgency']
    w = row['wait_days']
    d = row['distance_km']
    exp = row['exp_years']
    spd = row['queue_speed_mins']
    cost = row['financial_cost_index']
    rt_hrs = row['total_round_trip_hrs']
    rating = row['doctor_rating']
    tier = row['hospital_tier']
    mode = row['transport_mode']
    flight = row['flight_viable']

    total_days_until_home = w + (rt_hrs / 24.0)

    score = 100.0
    time_penalty = (total_days_until_home ** 1.6)
    effort_penalty = np.log1p(rt_hrs) * 3.0

    if u == 10:  # CRITICAL
        score -= time_penalty * 2.5
        score -= cost * 0.1
        score -= effort_penalty * 0.5
        score += min(10, (rating - 3.5) * 5.0)
        score += min(10, (40 - exp) * -0.2)
        if total_days_until_home > 5:
            score -= 40
        # Critical + flight is *good*: long-distance care delivered fastest.
        # This is the signal the v1 model couldn't see because flight_viable
        # was always 0.
        if flight == 1:
            score += 5
    elif u == 5:  # URGENT
        score -= time_penalty * 1.5
        score -= cost * 0.3
        score -= effort_penalty * 1.0
        score += min(8, (rating - 3.5) * 3.0)
    else:  # ROUTINE
        score -= time_penalty * 1.0
        score -= cost * 0.6
        score -= effort_penalty * 2.0
        if exp > 15:
            score += min(5, (exp - 15) * 0.2)
        if d > 100 and total_days_until_home > 5:
            score -= 20
        if d > 300:
            score -= 30
        # For routine patients, flight is over-engineered — mild penalty
        if flight == 1:
            score -= 3

    if tier == 1:
        score += 2
    elif tier == 3:
        score -= 2

    return max(0, min(100, score))


print("Generating oracle labels...")
df['optimal_score'] = df.apply(label, axis=1)

df.to_csv('medroute_nn_training_data_v2.csv', index=False)
print(f"Saved {NUM_SAMPLES} rows -> medroute_nn_training_data_v2.csv")
print(f"Mode distribution: {df['transport_mode'].value_counts().to_dict()}")
print(f"Flight viable rows: {df['flight_viable'].sum()} ({100*df['flight_viable'].mean():.1f}%)")
