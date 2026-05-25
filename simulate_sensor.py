import pandas as pd

# Load real CMAPSS FD001 data once at import time
_COLS = ['unit', 'cycle', 'os1', 'os2', 'os3'] + [f's{i}' for i in range(1, 22)]
_df = pd.read_csv('datasets/train_FD001.txt', sep=r'\s+', header=None, names=_COLS)

# Replay engine unit 1 (192 cycles, runs to failure)
_ENGINE_UNIT = 1
_engine_data = _df[_df['unit'] == _ENGINE_UNIT].reset_index(drop=True)
_idx = 0


def generate_sensor_data():
    """
    Returns one row of real CMAPSS turbofan sensor data as [[s4, s9, s20, s3, s14]].
    Advances one cycle per call. Loops back to cycle 1 after engine reaches end-of-life.

    Sensor mapping:
      s4  → HPC Outlet Temperature      (°R)   — rises with HPC degradation
      s9  → Physical Fan Speed Nf       (rpm)  — rises with degradation
      s20 → Fuel-Air Ratio              (—)    — drops with degradation
      s3  → LPC Outlet Total Pressure   (psi)
      s14 → HPC Outlet Static Pressure  (psi)
    """
    global _idx

    row = _engine_data.iloc[_idx]
    _idx = (_idx + 1) % len(_engine_data)

    engine_temp        = float(row['s4'])   # HPC outlet temperature (°R)
    vibration          = float(row['s9'])   # Physical fan speed Nf (rpm)
    oil_pressure       = float(row['s20'])  # Fuel-air ratio (drops when degraded)
    fuel_flow          = float(row['s3'])   # LPC outlet total pressure (psi)
    hydraulic_pressure = float(row['s14'])  # HPC outlet static pressure (psi)

    return [[engine_temp, vibration, oil_pressure, fuel_flow, hydraulic_pressure]]
