import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib

_COLS = ['unit', 'cycle', 'os1', 'os2', 'os3'] + [f's{i}' for i in range(1, 22)]
df = pd.read_csv('datasets/train_FD001.txt', sep=r'\s+', header=None, names=_COLS)

# Compute each engine's total lifespan, then keep only the first 30% of cycles
# (early cycles = healthy engine baseline before any degradation sets in)
max_cycles = df.groupby('unit')['cycle'].max().rename('cycle_max')
df = df.join(max_cycles, on='unit')
df['pct'] = df['cycle'] / df['cycle_max']
healthy = df[df['pct'] <= 0.30]

# Same 5 sensors used by simulate_sensor.py
SENSORS = ['s4', 's9', 's20', 's3', 's14']
normal_data = healthy[SENSORS].values  # shape: (N, 5)

print(f"Training on {len(normal_data)} real healthy-cycle rows "
      f"from {healthy['unit'].nunique()} engines (CMAPSS FD001).")

# contamination=0.05: real aircraft fault rate is ~5% — much lower than the old 0.1
model = IsolationForest(contamination=0.05, random_state=42)
model.fit(normal_data)

joblib.dump(model, 'aircraft_fault_model.pkl')
print("Model trained on real CMAPSS data and saved to aircraft_fault_model.pkl")
