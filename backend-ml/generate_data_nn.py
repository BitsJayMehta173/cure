import numpy as np
import pandas as pd
import random
import os

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

NUM_SAMPLES = 100000

print("Generating synthetic data for Neural Network...")

# Feature Ranges
urgency_levels = [1, 5, 10]
data = {
    'urgency': np.random.choice(urgency_levels, NUM_SAMPLES),
    'wait_days': np.random.randint(0, 31, NUM_SAMPLES),
    'distance_km': np.random.exponential(scale=300, size=NUM_SAMPLES).clip(0, 3000),
    'exp_years': np.random.randint(1, 41, NUM_SAMPLES),
    'queue_speed_mins': np.random.randint(5, 46, NUM_SAMPLES),
    'doctor_rating': np.random.uniform(2.5, 5.0, NUM_SAMPLES).round(1),
    'hospital_tier': np.random.choice([1, 2, 3], NUM_SAMPLES, p=[0.2, 0.5, 0.3])
}

df = pd.DataFrame(data)

def calculate_derived_features(row):
    d = row['distance_km']
    
    # Financial Cost Index (0-100)
    # Flights (>300km) are expensive, local transit is cheap
    if d < 50:
        cost = np.random.uniform(1, 10) # Local cab/auto
    elif d < 300:
        cost = np.random.uniform(10, 30) # Bus/Train
    else:
        cost = np.random.uniform(50, 100) # Flight/Long train
    
    # Total Round Trip Hrs
    # Travel time one-way
    travel_hrs = d / 50.0 if d < 300 else (d / 600.0) + 2.5
    
    # Hospital time (base 4 hours + wait time in queue)
    hospital_hrs = 4.0 + (row['queue_speed_mins'] / 60.0)
    
    # Total round trip = (Travel * 2) + hospital time
    # Plus sleep overhead if trip > 12 hours one way
    round_trip = (travel_hrs * 2) + hospital_hrs
    if travel_hrs > 12:
        round_trip += 12 # Overnight stay
        cost = min(100, cost + 20) # Hotel cost
        
    return pd.Series([cost, round_trip])

print("Calculating derived features...")
df[['financial_cost_index', 'total_round_trip_hrs']] = df.apply(calculate_derived_features, axis=1)

def calculate_human_oracle_score(row):
    u = row['urgency']
    w = row['wait_days']
    d = row['distance_km']
    exp = row['exp_years']
    spd = row['queue_speed_mins']
    cost = row['financial_cost_index']
    rt_hrs = row['total_round_trip_hrs']
    rating = row['doctor_rating']
    tier = row['hospital_tier']
    
    # Total time away from a healthy state (in days)
    # This is the "return time" concept the user asked for.
    # Total days until treatment is completed and patient is home.
    total_days_until_home = w + (rt_hrs / 24.0)
    
    # Base score
    score = 100.0
    
    # Non-linear exponential penalty for wait time (The "Time-Travel" Fix)
    # Waiting 2 days is barely penalized. Waiting 8 days is massively penalized.
    time_penalty = (total_days_until_home ** 1.6)
    
    # Diminishing returns on travel effort (Logarithmic scaling)
    # A 5-hour trip isn't 5x worse than a 1-hour trip if you're already committed to traveling.
    effort_penalty = np.log1p(rt_hrs) * 3.0
    
    if u == 10: # Critical
        score -= (time_penalty * 2.5) 
        score -= (cost * 0.1) 
        score -= (effort_penalty * 0.5)
        # Cap rating bonus
        score += min(10, (rating - 3.5) * 5.0) 
        score += min(10, (40 - exp) * -0.2) 
        if total_days_until_home > 5:
            score -= 40
            
    elif u == 5: # Urgent
        score -= (time_penalty * 1.5)
        score -= (cost * 0.3)
        score -= (effort_penalty * 1.0)
        score += min(8, (rating - 3.5) * 3.0)
        
    else: # Routine
        score -= (time_penalty * 1.0) # Still exponential!
        score -= (cost * 0.6) 
        score -= (effort_penalty * 2.0) 
        
        # Cap seniority bonus so it doesn't override massive wait time diffs
        if exp > 15: score += min(5, (exp - 15) * 0.2)
        
        # The "Useless Travel" edge case:
        # If travel is > 100km, but the total time until home is STILL high (> 5 days),
        # it means you traveled far for almost no reason.
        if d > 100 and total_days_until_home > 5:
            score -= 20
        
        if d > 300:
            score -= 30
            
    # Add non-linear bonuses/penalties
    if tier == 1: score += 2 
    elif tier == 3: score -= 2 
    
    # Ensure bounds
    return max(0, min(100, score))

print("Applying human oracle labeling...")
df['optimal_score'] = df.apply(calculate_human_oracle_score, axis=1)

df.to_csv('medroute_nn_training_data.csv', index=False)
print(f"Generated {NUM_SAMPLES} samples in medroute_nn_training_data.csv")
