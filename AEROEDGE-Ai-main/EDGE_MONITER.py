import joblib
from simulate_sensor import generate_sensor_data
import time

model = joblib.load("aircraft_fault_model.pkl")

print("\nEdge AI Aircraft Monitoring Started (CMAPSS FD001 — real turbofan data)\n")

while True:
    data = generate_sensor_data()
    prediction = model.predict(data)

    engine_temp, vibration, oil_pressure, fuel_flow, hydraulic_pressure = data[0]

    print("--------------------------------------------------")
    print(f"HPC Outlet Temperature : {engine_temp:.2f} °R")
    print(f"Physical Fan Speed Nf  : {vibration:.2f} rpm")
    print(f"Fuel-Air Ratio         : {oil_pressure:.4f}")
    print(f"LPC Outlet Pressure    : {fuel_flow:.2f} psi")
    print(f"HPC Outlet Pressure    : {hydraulic_pressure:.2f} psi")

    if prediction[0] == -1:
        print("\n⚠ ANOMALY DETECTED!")

        if engine_temp > 1425:
            print("🚨 HPC OVERHEAT — Temperature exceeds 1425 °R")
        elif vibration > 9110:
            print("🚨 FAN SPEED ANOMALY — Nf exceeds 9110 rpm")
        elif oil_pressure < 38.50:
            print("🚨 FUEL-AIR RATIO DROP — possible HPC degradation")
        else:
            print("🚨 COMPOUND ANOMALY — multi-sensor pattern detected")

    else:
        print("\n✅ System Normal")

    time.sleep(2)
