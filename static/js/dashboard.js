(function () {
    const state = window.GARUDA_STATE || {};
    const socketEnabled = Boolean(window.GARUDA_SOCKET_ENABLED);

    const els = {
        engineTemp:        document.getElementById("metric-engine-temp"),
        vibration:         document.getElementById("metric-vibration"),
        oilPressure:       document.getElementById("metric-oil-pressure"),
        fuelFlow:          document.getElementById("metric-fuel-flow"),
        hydraulicPressure: document.getElementById("metric-hydraulic-pressure"),
        healthScore:       document.getElementById("metric-health-score"),
        currentTime:       document.getElementById("current-time"),
        statusPill:        document.getElementById("status-pill"),
        analysisStatus:    document.getElementById("analysis-status"),
        analysisSignal:    document.getElementById("analysis-signal"),
        analysisText:      document.getElementById("analysis-text"),
        actionText:        document.getElementById("action-text"),
        predictionChip:    document.getElementById("prediction-chip"),
        riskChip:          document.getElementById("risk-chip"),
        topPanel:          document.getElementById("top-panel"),
        heroBadgeLabel:    document.getElementById("hero-badge-label"),
        heroBadgeDot:      document.getElementById("hero-badge-dot"),
        heroTagline:       document.getElementById("hero-tagline"),
        engineDot:         document.getElementById("engine-dot"),
        alertFeed:         document.getElementById("alert-feed"),
        feedMode:          document.getElementById("feed-mode"),
        criticalBanner:    document.getElementById("critical-banner"),
    };

    const chartCtx = document.getElementById("tempChart");
    let tempChart = null;
    let pollingTimer = null;

    const HERO_STATES = ["state-normal", "state-warning", "state-critical"];

    const BADGE_TEXT = {
        normal:   "LIVE TELEMETRY",
        warning:  "\u26A0 WARNING",
        critical: "\u26A0 CRITICAL ALERT",
    };

    const TAGLINE_TEXT = {
        normal:   "Powered by Isolation Forest ML \u00B7 Edge-deployed AI",
        warning:  "Warning threshold exceeded \u00B7 Monitor closely",
        critical: "Critical fault detected \u00B7 Immediate action required",
    };

    function updateHeroState(statusClass) {
        if (!els.topPanel) return;
        const sc = statusClass || "normal";
        HERO_STATES.forEach(cls => els.topPanel.classList.remove(cls));
        els.topPanel.classList.add("state-" + sc);
        if (els.heroBadgeLabel) els.heroBadgeLabel.textContent = BADGE_TEXT[sc] || BADGE_TEXT.normal;
        if (els.heroTagline)    els.heroTagline.textContent    = TAGLINE_TEXT[sc] || TAGLINE_TEXT.normal;
    }

    function statusToPillClass(sc) {
        if (sc === "critical") return "status-critical";
        if (sc === "warning")  return "status-warning";
        return "status-normal";
    }

    function statusToChipClass(sc) {
        if (sc === "critical") return "chip-red";
        if (sc === "warning")  return "chip-amber";
        return "chip-green";
    }

    function setMetric(el, value, unit) {
        if (!el) return;
        el.innerHTML = `${value} <span class="metric-unit">${unit}</span>`;
    }

    function setFeedMode(label, chipClass) {
        if (!els.feedMode) return;
        els.feedMode.textContent = label;
        els.feedMode.classList.remove("chip-green", "chip-amber", "chip-red");
        els.feedMode.classList.add(chipClass);
    }

    function updateChart(tempHist, vibHist, oilHist) {
        if (!chartCtx) return;
        const safeTempHist = Array.isArray(tempHist) ? tempHist : [];
        const safeVibHist  = Array.isArray(vibHist)  ? vibHist  : [];
        const safeOilHist  = Array.isArray(oilHist)  ? oilHist  : [];
        const labels = safeTempHist.map((_, i) => i + 1);

        if (!tempChart) {
            tempChart = new Chart(chartCtx, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "HPC Outlet Temp (°R)",
                            data: safeTempHist,
                            borderColor: "#22d3ee",
                            backgroundColor: "rgba(34,211,238,0.08)",
                            fill: true,
                            pointRadius: 1,
                            borderWidth: 2,
                            tension: 0.35,
                            yAxisID: "y",
                        },
                        {
                            label: "Fan Speed Nf (rpm)",
                            data: safeVibHist,
                            borderColor: "#f59e0b",
                            backgroundColor: "rgba(245,158,11,0.10)",
                            fill: false,
                            pointRadius: 1,
                            borderWidth: 2,
                            tension: 0.35,
                            yAxisID: "y1",
                        },
                        {
                            label: "Fuel-Air Ratio",
                            data: safeOilHist,
                            borderColor: "#10b981",
                            backgroundColor: "rgba(16,185,129,0.10)",
                            fill: false,
                            pointRadius: 1,
                            borderWidth: 2,
                            tension: 0.35,
                            yAxisID: "y2",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                        legend: {
                            labels: {
                                color: "#cbd5e1",
                                usePointStyle: true,
                                pointStyleWidth: 10,
                                padding: 18,
                                font: { size: 11 },
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { color: "#94a3b8" },
                            grid: { color: "rgba(148,163,184,.08)" },
                        },
                        y: {
                            type: "linear",
                            display: true,
                            position: "left",
                            ticks: { color: "#22d3ee", font: { size: 10 } },
                            grid: { color: "rgba(148,163,184,.08)" },
                            title: { display: true, text: "HPC Temp (°R)", color: "#22d3ee", font: { size: 10 } },
                        },
                        y1: {
                            type: "linear",
                            display: true,
                            position: "right",
                            ticks: { color: "#f59e0b", font: { size: 10 } },
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: "Fan Speed (rpm)", color: "#f59e0b", font: { size: 10 } },
                        },
                        y2: {
                            type: "linear",
                            display: true,
                            position: "right",
                            ticks: { color: "#10b981", font: { size: 10 } },
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: "Fuel-Air Ratio", color: "#10b981", font: { size: 10 } },
                            offset: true,
                        },
                    },
                },
            });
            return;
        }

        tempChart.data.labels = labels;
        tempChart.data.datasets[0].data = safeTempHist;
        tempChart.data.datasets[1].data = safeVibHist;
        tempChart.data.datasets[2].data = safeOilHist;
        tempChart.update("none");
    }

    function prependFeedItem(snapshot) {
        if (!els.alertFeed) return;
        const item = document.createElement("li");
        const status      = snapshot.status      || "NORMAL";
        const statusClass = snapshot.status_class || "normal";
        item.innerHTML = `
            <span class="feed-time">${snapshot.current_time || "--:--:--"}</span>
            <span class="feed-status ${statusClass}">${status}</span>
            <span class="feed-text">${snapshot.analysis || "No analysis available"}</span>
        `;
        els.alertFeed.prepend(item);
        while (els.alertFeed.children.length > 12) {
            els.alertFeed.removeChild(els.alertFeed.lastElementChild);
        }
    }

    function applySnapshot(snapshot, pushFeed) {
        if (!snapshot) return;

        setMetric(els.engineTemp,        snapshot.engine_temp,        "°R");
        setMetric(els.vibration,         snapshot.vibration,          "rpm");
        setMetric(els.oilPressure,       snapshot.oil_pressure,       "");
        setMetric(els.fuelFlow,          snapshot.fuel_flow,          "psi");
        setMetric(els.hydraulicPressure, snapshot.hydraulic_pressure, "psi");
        setMetric(els.healthScore,       snapshot.health_score,       "%");

        if (els.currentTime) els.currentTime.textContent = snapshot.current_time || "--:--:--";

        if (els.statusPill) {
            els.statusPill.textContent = snapshot.status || "NORMAL";
            els.statusPill.classList.remove("status-normal", "status-warning", "status-critical");
            els.statusPill.classList.add(statusToPillClass(snapshot.status_class));
        }

        if (els.analysisStatus) els.analysisStatus.textContent = snapshot.status || "NORMAL";
        if (els.analysisSignal) els.analysisSignal.textContent = snapshot.prediction === -1 ? "Outlier" : "Nominal";
        if (els.analysisText)   els.analysisText.textContent   = snapshot.analysis || "";
        if (els.actionText)     els.actionText.textContent     = snapshot.action   || "";

        if (els.riskChip) {
            const riskIndex = Math.max(0, 100 - Number(snapshot.health_score || 0));
            els.riskChip.textContent = `Risk Index ${riskIndex}`;
            els.riskChip.classList.remove("chip-red", "chip-amber", "chip-green");
            els.riskChip.classList.add(statusToChipClass(snapshot.status_class));
        }

        if (els.predictionChip) {
            const anomaly = snapshot.prediction === -1;
            els.predictionChip.textContent = anomaly ? "ANOMALY" : "NORMAL";
            els.predictionChip.classList.remove("chip-red", "chip-green");
            els.predictionChip.classList.add(anomaly ? "chip-red" : "chip-green");
        }

        if (els.engineDot) els.engineDot.classList.toggle("hidden", !snapshot.critical);

        updateHeroState(snapshot.status_class);
        updateChart(snapshot.temp_history, snapshot.vib_history, snapshot.oil_history);

        if (pushFeed) prependFeedItem(snapshot);
    }

    applySnapshot(state, false);

    async function fetchSnapshot() {
        try {
            const response = await fetch("/?format=json", { cache: "no-store" });
            if (!response.ok) return;
            const snapshot = await response.json();
            applySnapshot(snapshot, true);
        } catch (_) {}
    }

    function startPolling(label, chipClass) {
        if (pollingTimer) return;
        setFeedMode(label, chipClass);
        pollingTimer = setInterval(fetchSnapshot, 3000);
    }

    if (socketEnabled && typeof io === "function") {
        const socket = io({ transports: ["websocket", "polling"] });
        let socketConnected = false;

        socket.on("connect", function () {
            socketConnected = true;
            if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
            setFeedMode("Socket Live", "chip-green");
        });

        socket.on("telemetry", function (snapshot) {
            applySnapshot(snapshot, true);
        });

        socket.on("connect_error", function () {
            if (!socketConnected) startPolling("Polling Fallback", "chip-amber");
        });

        setTimeout(function () {
            if (!socketConnected) startPolling("Polling Fallback", "chip-amber");
        }, 5000);
    } else {
        startPolling("Polling Live", "chip-amber");
    }
})();
