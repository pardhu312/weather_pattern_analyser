import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

import {
    getDashboardSummary,
    getWeatherData
} from "../services/api";

import Sidebar from "../components/Sidebar";

import "./Dashboard.css";


/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({
    label,
    value,
    subtitle,
    icon,
    accent = "blue",
    onClick
}) {
    return (
        <div
            className={`stat-card ${accent} ${onClick ? "clickable" : ""}`}
            onClick={onClick}
            style={onClick ? { cursor: "pointer" } : undefined}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >

            <div className="stat-card-top">

                <div className="stat-icon">
                    {icon}
                </div>

                <span className="stat-live">
                    {onClick ? "VIEW →" : "LIVE"}
                </span>

            </div>

            <div className="stat-value">
                {value}
            </div>

            <div className="stat-label">
                {label}
            </div>

            <div className="stat-subtitle">
                {subtitle}
            </div>

        </div>
    );
}


/* =========================================================
   WEATHER CARD
   ========================================================= */

function WeatherCard({
    city,
    weather,
    onClick
}) {
    if (!weather) {
        return (
            <div
                className={`weather-card ${onClick ? "clickable" : ""}`}
                onClick={onClick}
                style={onClick ? { cursor: "pointer" } : undefined}
            >

                <div className="weather-card-header">

                    <div>

                        <h3>
                            {city}
                        </h3>

                        <span>
                            No recent data
                        </span>

                    </div>

                    <div className="city-status offline">
                        ●
                    </div>

                </div>

            </div>
        );
    }

    const observedAt = weather.observedAt
        ? new Date(weather.observedAt)
        : null;

    return (
        <div
            className={`weather-card ${onClick ? "clickable" : ""}`}
            onClick={onClick}
            style={onClick ? { cursor: "pointer" } : undefined}
            title={`Inspect ${city} weather observations`}
        >

            <div className="weather-card-header">

                <div>

                    <h3>
                        {city}
                    </h3>

                    <span>
                        {observedAt
                            ? observedAt.toLocaleTimeString(
                                [],
                                {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            )
                            : "—"}
                    </span>

                </div>

                <div className="city-status">
                    ●
                </div>

            </div>

            <div className="weather-temperature">

                <strong>
                    {Number(weather.temperature).toFixed(1)}
                </strong>

                <span>
                    °C
                </span>

            </div>

            <div className="weather-feels">

                Feels like{" "}

                {weather.feelsLike != null
                    ? `${Number(weather.feelsLike).toFixed(1)}°C`
                    : "—"}

            </div>

            <div className="weather-metrics">

                <div>

                    <span>
                        Humidity
                    </span>

                    <strong>
                        {weather.humidity ?? "—"}%
                    </strong>

                </div>

                <div>

                    <span>
                        Wind
                    </span>

                    <strong>
                        {weather.windSpeed != null
                            ? `${Number(weather.windSpeed).toFixed(1)} m/s`
                            : "—"}
                    </strong>

                </div>

                <div>

                    <span>
                        Pressure
                    </span>

                    <strong>
                        {weather.pressure ?? "—"} hPa
                    </strong>

                </div>

                <div>

                    <span>
                        Clouds
                    </span>

                    <strong>
                        {weather.cloudPercent ?? "—"}%
                    </strong>

                </div>

            </div>

        </div>
    );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard() {

    const navigate = useNavigate();





    /* -----------------------------------------------------
       State
       ----------------------------------------------------- */

    const [summary, setSummary] = useState(null);

    const [weatherData, setWeatherData] = useState([]);

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");


    /* -----------------------------------------------------
       Always open dashboard at the top
       ----------------------------------------------------- */

    useEffect(() => {

        const dashboardMain =
            document.querySelector(".dashboard-main");

        if (dashboardMain) {
            dashboardMain.scrollTop = 0;
        }

    }, []);


    /* -----------------------------------------------------
       Load dashboard data
       ----------------------------------------------------- */

    async function loadDashboard(isRefresh = false) {

        try {

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");


            const [
                summaryData,
                weather
            ] = await Promise.all([
                getDashboardSummary(),
                getWeatherData()
            ]);


            setSummary(summaryData);

            setWeatherData(
                Array.isArray(weather)
                    ? weather
                    : []
            );

        } catch (err) {

            console.error(
                "Dashboard loading error:",
                err
            );

            setError(
                "Unable to load the weather intelligence data."
            );

        } finally {

            setLoading(false);

            setRefreshing(false);

        }
    }


    /* -----------------------------------------------------
       Initial loading + automatic refresh
       ----------------------------------------------------- */

    useEffect(() => {

        loadDashboard();


        const interval = setInterval(() => {
            loadDashboard(true);
        }, 60_000);


        return () => {
            clearInterval(interval);
        };

    }, []);





    /* =====================================================
       LATEST OBSERVATION PER CITY
       ===================================================== */

    const latestByCity = useMemo(() => {

        const result = {};

        for (const item of weatherData) {

            if (!item.city) {
                continue;
            }

            const current =
                result[item.city];


            if (
                !current ||
                new Date(item.observedAt) >
                new Date(current.observedAt)
            ) {

                result[item.city] = item;

            }

        }

        return result;

    }, [weatherData]);


    /* =====================================================
       CHART DATA
       ===================================================== */

    const chartData = useMemo(() => {

        const sorted = [...weatherData]

            .filter(
                item =>
                    item.observedAt &&
                    item.temperature != null &&
                    item.city
            )

            .sort(
                (a, b) =>
                    new Date(a.observedAt) -
                    new Date(b.observedAt)
            )

            .slice(-100);


        const grouped = {};


        sorted.forEach((item) => {

            const date =
                new Date(item.observedAt);


            const bucketTime =
                new Date(date);


            bucketTime.setMinutes(
                Math.floor(
                    bucketTime.getMinutes() / 10
                ) * 10,
                0,
                0
            );


            const timestamp =
                bucketTime.getTime();


            if (!grouped[timestamp]) {

                grouped[timestamp] = {

                    timestamp,

                    time:
                        bucketTime.toLocaleTimeString(
                            [],
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )

                };

            }


            grouped[timestamp][item.city] =
                Number(item.temperature);

        });


        return Object.values(grouped)

            .sort(
                (a, b) =>
                    a.timestamp -
                    b.timestamp
            );

    }, [weatherData]);


    /* =====================================================
       DASHBOARD VALUES
       ===================================================== */

    const cities =
        summary?.dataset?.cities || [];


    const anomalyCount =
        summary?.anomalies?.total_anomalies ?? "—";


    const clusterScore =
        summary?.clustering?.silhouette_score;


    const mlReady =
        summary?.model_evaluation?.ready === true;


    const totalRows =
        summary?.dataset?.total_rows ?? "—";


    const targetCoverage =
        summary?.training?.target_coverage_percent;


    /* -----------------------------------------------------
       City line colors
       ----------------------------------------------------- */

    const cityColors = {

        Bengaluru: "#38bdf8",

        Chennai: "#fb923c",

        Delhi: "#4ade80",

        Hyderabad: "#c084fc",

        Mumbai: "#f87171"

    };


    /* =====================================================
       RENDER
       ===================================================== */

    return (

        <div className="dashboard">


            {/* Decorative background */}

            <div className="dashboard-orb orb-one"></div>

            <div className="dashboard-orb orb-two"></div>


            {/* =================================================
               SIDEBAR
               ================================================= */}

            <Sidebar />


            {/* =================================================
               MAIN
               ================================================= */}

            <main className="dashboard-main">


                {/* Header */}

                <header className="dashboard-header">

                    <div>

                        <div className="header-eyebrow">
                            WEATHER INTELLIGENCE
                        </div>

                        <h1>
                            Weather Overview
                        </h1>

                        <p>
                            Real-time observations and
                            AI-powered environmental insights.
                        </p>

                    </div>


                    <div className="header-actions">

                        <div className="live-status">

                            <span className="live-dot"></span>

                            <span>
                                System Online
                            </span>

                        </div>


                        <button
                            className="refresh-button"
                            onClick={() =>
                                loadDashboard(true)
                            }
                            disabled={refreshing}
                        >

                            <span
                                className={
                                    refreshing
                                        ? "spin"
                                        : ""
                                }
                            >
                                ↻
                            </span>


                            {refreshing
                                ? "Updating"
                                : "Refresh"}

                        </button>

                    </div>

                </header>


                {/* Error */}

                {error && (

                    <div className="error-banner">

                        <span>
                            !
                        </span>

                        {error}

                        <button
                            onClick={() =>
                                loadDashboard()
                            }
                        >
                            Retry
                        </button>

                    </div>

                )}


                {/* =================================================
                   STAT CARDS
                   ================================================= */}

                <section className="stats-grid">

                    <StatCard
                        label="Total Observations"
                        value={
                            loading
                                ? "..."
                                : totalRows
                        }
                        subtitle="Weather records collected"
                        icon="◈"
                        accent="blue"
                        onClick={() => navigate("/weather")}
                    />


                    <StatCard
                        label="Active Cities"
                        value={
                            cities.length
                        }
                        subtitle="Monitored locations"
                        icon="◎"
                        accent="cyan"
                        onClick={() => navigate("/clusters")}
                    />


                    <StatCard
                        label="Anomalies"
                        value={
                            loading
                                ? "..."
                                : anomalyCount
                        }
                        subtitle="Detected candidates"
                        icon="!"
                        accent="orange"
                        onClick={() => navigate("/anomalies")}
                    />


                    <StatCard
                        label="Forecasting"
                        value={
                            mlReady
                                ? "READY"
                                : "BUILDING"
                        }
                        subtitle={
                            targetCoverage != null
                                ? `${Number(targetCoverage).toFixed(1)}% target coverage`
                                : "Collecting training data"
                        }
                        icon="✦"
                        accent="purple"
                        onClick={() => navigate("/predictions")}
                    />

                </section>


                {/* =================================================
                   CHART + AI
                   ================================================= */}

                <section className="main-grid">


                    {/* Temperature chart */}

                    <div className="glass-panel chart-panel">

                        <div className="panel-heading">

                            <div>

                                <span>
                                    LIVE ANALYTICS
                                </span>

                                <h2>
                                    Temperature Trends
                                </h2>

                            </div>


                            <div className="panel-chip">
                                Last 100 observations
                            </div>

                        </div>


                        <div className="chart-container">

                            {chartData.length === 0 ? (

                                <div className="empty-state">

                                    <div className="empty-icon">
                                        ◌
                                    </div>

                                    <h3>
                                        Waiting for weather observations
                                    </h3>

                                    <p>
                                        New observations will
                                        appear here automatically.
                                    </p>

                                </div>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <LineChart
                                        data={chartData}

                                        margin={{
                                            top: 10,
                                            right: 15,
                                            left: 0,
                                            bottom: 5
                                        }}
                                    >

                                        <CartesianGrid
                                            stroke="#1e293b"
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="time"

                                            stroke="#64748b"

                                            tick={{
                                                fill: "#64748b",
                                                fontSize: 10
                                            }}

                                            tickLine={false}
                                            axisLine={false}
                                        />

                                        <YAxis
                                            stroke="#64748b"

                                            tick={{
                                                fill: "#64748b",
                                                fontSize: 10
                                            }}

                                            tickLine={false}
                                            axisLine={false}

                                            unit="°C"
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background:
                                                    "#0f172a",

                                                border:
                                                    "1px solid #1e293b",

                                                borderRadius:
                                                    "12px",

                                                color:
                                                    "#e2e8f0"
                                            }}
                                        />

                                        <Legend />

                                        {cities.map(
                                            (city) => (

                                                <Line
                                                    key={city}

                                                    type="monotone"

                                                    dataKey={city}

                                                    name={city}

                                                    stroke={
                                                        cityColors[city]
                                                        || "#38bdf8"
                                                    }

                                                    strokeWidth={2}

                                                    dot={false}

                                                    connectNulls={true}

                                                    isAnimationActive={false}
                                                />

                                            )
                                        )}

                                    </LineChart>

                                </ResponsiveContainer>

                            )}

                        </div>

                    </div>


                    {/* AI intelligence panel */}

                    <div className="glass-panel intelligence-panel">

                        <div className="panel-heading">

                            <div>

                                <span>
                                    AI SYSTEM
                                </span>

                                <h2>
                                    Intelligence
                                </h2>

                            </div>

                            <div className="ai-badge">
                                ✦ AI
                            </div>

                        </div>


                        <div className="intelligence-items">

                            <div
                                className="intelligence-item"
                                onClick={() => navigate("/anomalies")}
                                style={{ cursor: "pointer" }}
                                title="Inspect anomalies"
                            >

                                <div className="intelligence-icon success">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        Anomaly Detection
                                    </strong>

                                    <span>
                                        Isolation Forest active
                                    </span>

                                </div>

                                <div className="intelligence-state">
                                    ACTIVE →
                                </div>

                            </div>


                            <div
                                className="intelligence-item"
                                onClick={() => navigate("/clusters")}
                                style={{ cursor: "pointer" }}
                                title="Inspect city clusters"
                            >

                                <div className="intelligence-icon success">
                                    ✓
                                </div>

                                <div>

                                    <strong>
                                        City Clustering
                                    </strong>

                                    <span>
                                        K-Means analysis available
                                    </span>

                                </div>

                                <div className="intelligence-state">
                                    ACTIVE →
                                </div>

                            </div>


                            <div
                                className="intelligence-item"
                                onClick={() => navigate("/predictions")}
                                style={{ cursor: "pointer" }}
                                title="Inspect temperature forecasting pipeline"
                            >

                                <div className="intelligence-icon pending">
                                    ◷
                                </div>

                                <div>

                                    <strong>
                                        Temperature Forecasting
                                    </strong>

                                    <span>
                                        {mlReady
                                            ? "Models ready"
                                            : "Collecting training data"}
                                    </span>

                                </div>

                                <div className="intelligence-state pending-text">

                                    {mlReady
                                        ? "READY →"
                                        : "BUILDING →"}

                                </div>

                            </div>

                        </div>


                        <div
                            className="cluster-summary"
                            onClick={() => navigate("/clusters")}
                            style={{ cursor: "pointer" }}
                            title="Inspect cluster quality & groupings"
                        >

                            <div>

                                <span>
                                    Cluster quality
                                </span>

                                <strong>

                                    {clusterScore != null
                                        ? Number(
                                            clusterScore
                                        ).toFixed(3)
                                        : "—"}

                                </strong>

                            </div>


                            <div>

                                <span>
                                    Cities
                                </span>

                                <strong>
                                    {cities.length}
                                </strong>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                   CITY WEATHER
                   ================================================= */}

                <section className="city-section">

                    <div className="section-heading">

                        <div>

                            <span>
                                MONITORED LOCATIONS
                            </span>

                            <h2>
                                Current City Conditions
                            </h2>

                        </div>

                        <p>
                            Click any city card to view detailed observation logs
                        </p>

                    </div>


                    <div className="weather-grid">

                        {cities.map(
                            (city) => (

                                <WeatherCard
                                    key={city}
                                    city={city}
                                    weather={
                                        latestByCity[city]
                                    }
                                    onClick={() => navigate(`/weather?city=${encodeURIComponent(city)}`)}
                                />

                            )
                        )}

                    </div>

                </section>


                {/* =================================================
                   SYSTEM STATUS
                   ================================================= */}

                <section className="bottom-grid">

                    <div
                        className="glass-panel status-panel"
                        onClick={() => navigate("/weather")}
                        style={{ cursor: "pointer" }}
                        title="Open weather monitor"
                    >

                        <div className="status-panel-icon">
                            ◉
                        </div>

                        <div>

                            <span>
                                DATA COLLECTION
                            </span>

                            <h3>
                                Monitoring is active
                            </h3>

                            <p>
                                Spring Boot is continuously
                                collecting weather observations
                                from all configured cities.
                            </p>

                        </div>

                        <div className="status-online">
                            ONLINE →
                        </div>

                    </div>


                    <div
                        className="glass-panel status-panel"
                        onClick={() => navigate("/models")}
                        style={{ cursor: "pointer" }}
                        title="Open ML Models registry"
                    >

                        <div className="status-panel-icon purple-icon">
                            ✦
                        </div>

                        <div>

                            <span>
                                ML PIPELINE
                            </span>

                            <h3>

                                {mlReady
                                    ? "Ready for predictions"
                                    : "Training dataset building"}

                            </h3>

                            <p>
                                Historical observations are being
                                prepared for time-aware temperature
                                forecasting.
                            </p>

                        </div>

                        <div className="status-building">

                            {mlReady
                                ? "READY →"
                                : "BUILDING →"}

                        </div>

                    </div>

                </section>


            </main>

        </div>
    );
}


export default Dashboard;