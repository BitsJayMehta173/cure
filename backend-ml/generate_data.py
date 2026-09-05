import numpy as np
import pandas as pd
import random
import os

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

NUM_SAMPLES = 100000

# Feature Ranges
# Urgency: 1 (Routine), 5 (Urgent), 10 (Critical)
urgency_levels = [1, 5, 10]
wait_days_range = (0, 30)
distance_range = (0, 3000)
exp_range = (1, 40)
speed_range = (5, 45)

data = {
    'urgency': np.random.choice(urgency_levels, NUM_SAMPLES),
    'wait_days': np.random.randint(wait_days_range[0], wait_days_range[1] + 1, NUM_SAMPLES),
    'distance_km': np.random.exponential(scale=300, size=NUM_SAMPLES).clip(0, 3000), # Most are local, some are far
    'exp_years': np.random.randint(exp_range[0], exp_range[1] + 1, NUM_SAMPLES),
    'queue_speed_mins': np.random.randint(speed_range[0], speed_range[1] + 1, NUM_SAMPLES)
}

df = pd.DataFrame(data)

def calculate_ground_truth(row):
    u = row['urgency']
    w = row['wait_days']
    d = row['distance_km']
    exp = row['exp_years']
    spd = row['queue_speed_mins']
    
    # Base travel time
    travel_hrs = d / 50.0 if d < 300 else (d / 600.0) + 2.5
    
    # Total effective days
    t_total = w + (travel_hrs / 24.0)
    
    # Non-linear scaling based on urgency
    if u == 10: # Critical
        # Heavy penalty on wait, low on distance
        w_wait = 15.0
        w_dist = 0.5
        score = 100 - (w_wait * t_total) - (w_dist * (d / 100.0))
        # Hard edge case: > 5 days wait for critical is very bad
        if w > 5:
            score -= 30
    elif u == 5: # Urgent
        w_wait = 8.0
        w_dist = 2.0
        score = 100 - (w_wait * t_total) - (w_dist * (d / 100.0))
        if w > 14:
            score -= 20
    else: # Routine
        w_wait = 4.0
        w_dist = 5.0
        score = 100 - (w_wait * t_total) - (w_dist * (d / 50.0))
        # Hard edge case: > 300km travel for routine is ridiculous
        if d > 300:
            score -= 40
            
    # Add non-linear bonuses
    if exp > 20: score += 5
    elif exp > 10: score += 2
    
    if spd < 15: score += 3
    elif spd > 30: score -= 3
    
    # Add some random noise for realism
    score += np.random.normal(0, 1.5)
    
    return max(0, min(100, score))

df['optimal_score'] = df.apply(calculate_ground_truth, axis=1)

df.to_csv('medroute_training_data.csv', index=False)
print(f"Generated {NUM_SAMPLES} samples in medroute_training_data.csv")
