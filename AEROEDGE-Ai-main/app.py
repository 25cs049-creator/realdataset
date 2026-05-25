from __future__ import annotations

import datetime
import warnings
from threading import Lock

import joblib
from flask import Flask, jsonify, render_template, request
from sklearn.exceptions import InconsistentVersionWarning

from simulate_sensor import generate_sensor_data

warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

app = Flask(__name__)
model = joblib.load("aircraft_fault_model.pkl")

try:
    from flask_socketio import SocketIO, emit

    socketio = SocketIO(app, async_mode="threading")
except ImportError:
    socketio = None

HISTORY_LIMIT = 20
temp_history: list[float] = []
vib_history: list[float] = []
oil_history: list[float] = []
history_lock = Lock()
telemetry_lock = Lock()
telemetry_task_started = False


def _determine_status(engine_temp: float, vibration: float, oil_pressure: float, prediction: int) -> dict:
    status = "NORMAL"
    status_class = "normal"
    health_score = 92
    analysis = "All parameters operating within safe limits."
    action = "Continue monitoring."
    critical = False

    # Thresholds calibrated to real CMAPSS FD001 sensor scales:
    #   engine_temp  = s4  (HPC outlet temp, °R)   — healthy ~1393–1413, degraded ~1410–1432
    #   vibration    = s9  (fan speed Nf, rpm)      — healthy ~9042–9069, degraded ~9040–9155
    #   oil_pressure = s20 (fuel-air ratio)         — healthy ~38.72–39.14, DROPS when degraded
    if engine_temp > 1425 or vibration > 9110 or oil_pressure < 38.50 or prediction == -1:
        status = "CRITICAL"
        status_class = "critical"
        health_score = 35
        analysis = "Engine anomaly detected."
        action = "Immediate inspection required."
        critical = True
    elif engine_temp > 1415 or vibration > 9075:
        status = "WARNING"
        status_class = "warning"
        health_score = 65
        analysis = "Parameters approaching limits."
        action = "Schedule maintenance check."

    return {
        "status": status,
        "status_class": status_class,
        "health_score": health_score,
        "analysis": analysis,
        "action": action,
        "critical": critical,
    }


def _build_snapshot() -> dict:
    data = generate_sensor_data()
    prediction = int(model.predict(data)[0])

    engine_temp, vibration, oil_pressure, fuel_flow, hydraulic_pressure = data[0]

    with history_lock:
        temp_history.append(round(engine_temp, 2))
        if len(temp_history) > HISTORY_LIMIT:
            temp_history.pop(0)
        vib_history.append(round(vibration, 2))
        if len(vib_history) > HISTORY_LIMIT:
            vib_history.pop(0)
        oil_history.append(round(oil_pressure, 2))
        if len(oil_history) > HISTORY_LIMIT:
            oil_history.pop(0)
        history = list(temp_history)
        vib_hist = list(vib_history)
        oil_hist = list(oil_history)

    status_data = _determine_status(engine_temp, vibration, oil_pressure, prediction)

    snapshot = {
        "engine_temp": round(engine_temp, 2),
        "vibration": round(vibration, 2),
        "oil_pressure": round(oil_pressure, 2),
        "fuel_flow": round(fuel_flow, 2),
        "hydraulic_pressure": round(hydraulic_pressure, 2),
        "temp_history": history,
        "vib_history": vib_hist,
        "oil_history": oil_hist,
        "prediction": prediction,
        "current_time": datetime.datetime.now().strftime("%H:%M:%S"),
    }
    snapshot.update(status_data)
    return snapshot


def _start_telemetry_loop() -> None:
    global telemetry_task_started

    if socketio is None:
        return

    with telemetry_lock:
        if telemetry_task_started:
            return
        socketio.start_background_task(_telemetry_broadcast_loop)
        telemetry_task_started = True


def _telemetry_broadcast_loop() -> None:
    while True:
        socketio.sleep(3)
        socketio.emit("telemetry", _build_snapshot())


@app.route("/")
def dashboard():
    snapshot = _build_snapshot()
    if request.args.get("format") == "json":
        return jsonify(snapshot)

    if socketio is not None:
        _start_telemetry_loop()

    return render_template(
        "dashboard.html",
        **snapshot,
        socketio_enabled=socketio is not None,
    )


if socketio is not None:

    @socketio.on("connect")
    def handle_connect() -> None:
        _start_telemetry_loop()
        emit("telemetry", _build_snapshot(), to=request.sid)


if __name__ == "__main__":
    if socketio is not None:
        socketio.run(app, debug=True)
    else:
        app.run(debug=True)
