from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import torch
import torch.nn as nn
import numpy as np

app = Flask(__name__)
CORS(app)

features = ['urgency', 'wait_days', 'distance_km', 'exp_years',
            'queue_speed_mins', 'financial_cost_index', 'total_round_trip_hrs',
            'doctor_rating', 'hospital_tier',
            'transport_mode', 'flight_viable']

class ClinicalNet(nn.Module):
    def __init__(self, input_dim):
        super(ClinicalNet, self).__init__()
        self.fc1 = nn.Linear(input_dim, 64)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(0.2)
        self.fc2 = nn.Linear(64, 128)
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(0.2)
        self.fc3 = nn.Linear(128, 64)
        self.relu3 = nn.ReLU()
        self.fc4 = nn.Linear(64, 1)
        
    def forward(self, x):
        x = self.dropout1(self.relu1(self.fc1(x)))
        x = self.dropout2(self.relu2(self.fc2(x)))
        x = self.relu3(self.fc3(x))
        x = self.fc4(x)
        return x

print("Loading Scaler...")
with open('scaler.pkl', 'rb') as f:
    scaler = pickle.load(f)

print("Loading PyTorch ML model...")
model = ClinicalNet(len(features))
model.load_state_dict(torch.load('medroute_nn_model.pt', weights_only=True))
model.eval()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "model": "ClinicalNet", "version": "1.0"})

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    
    if not isinstance(data, list):
        return jsonify({"error": "Input must be a list of dictionaries"}), 400
        
    df = pd.DataFrame(data)
    
    for col in features:
        if col not in df.columns:
            # Provide sensible defaults if Java backend missed a new feature
            if col == 'financial_cost_index': df[col] = 50.0
            elif col == 'total_round_trip_hrs': df[col] = df['distance_km'] / 50.0 * 2.0 + 4.0
            elif col == 'doctor_rating': df[col] = 4.0
            elif col == 'hospital_tier': df[col] = 2
            elif col == 'transport_mode': df[col] = 0  # Auto
            elif col == 'flight_viable': df[col] = 0
            else:
                return jsonify({"error": f"Missing column: {col}"}), 400
            
    df = df[features]
    
    # Scale features
    X_scaled = scaler.transform(df.values)
    X_tensor = torch.FloatTensor(X_scaled)
    
    # Predict
    with torch.no_grad():
        preds = model(X_tensor).numpy().flatten()
    
    # Ensure bounds [0, 100]
    preds = [max(0.0, min(100.0, float(p))) for p in preds]
    
    return jsonify(preds)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
