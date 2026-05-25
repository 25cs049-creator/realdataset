import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

model = joblib.load('aircraft_fault_model.pkl')

_COLS = ['unit', 'cycle', 'os1', 'os2', 'os3'] + [f's{i}' for i in range(1, 22)]
df = pd.read_csv('datasets/train_FD001.txt', sep=r'\s+', header=None, names=_COLS)

max_cycles = df.groupby('unit')['cycle'].max().rename('cycle_max')
df = df.join(max_cycles, on='unit')
df['pct'] = df['cycle'] / df['cycle_max']

SENSORS = ['s4', 's9', 's20', 's3', 's14']

# Normal: first 30% of each engine's life (healthy baseline)
normal_data = df[df['pct'] <= 0.30][SENSORS].values

# Degraded: last 20% of each engine's life (near end-of-life)
faulty_data = df[df['pct'] >= 0.80][SENSORS].values

# Sample 500 from each for a balanced evaluation set
np.random.seed(42)
n = min(500, len(normal_data), len(faulty_data))
normal_sample = normal_data[np.random.choice(len(normal_data), n, replace=False)]
faulty_sample = faulty_data[np.random.choice(len(faulty_data), n, replace=False)]

X_test = np.vstack([normal_sample, faulty_sample])
y_true = np.hstack([np.zeros(n), np.ones(n)])

# IsolationForest returns 1 (normal) or -1 (anomaly) — convert to 0/1
y_pred = np.where(model.predict(X_test) == -1, 1, 0)

print(f"Test set: {n} normal + {n} degraded samples from CMAPSS FD001\n")
print(f"Accuracy: {accuracy_score(y_true, y_pred):.4f}")
print(f"\nConfusion Matrix:\n{confusion_matrix(y_true, y_pred)}")
print(f"\nClassification Report:\n"
      f"{classification_report(y_true, y_pred, target_names=['Normal', 'Degraded'])}")
