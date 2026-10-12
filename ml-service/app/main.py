import os
from pathlib import Path
import pandas as pd
import psycopg
from .xgboost_model import train_xgboost
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .features import build_features
from .baseline import evaluate_persistence_baseline
from .features import build_features
from .model_utils import train_linear_regression
from .random_forest import train_random_forest
from .model_comparison import compare_models
from .explainability import (
    random_forest_feature_importance,
)
from .evaluation import evaluate_random_forest
from .anomaly import detect_anomalies
from .clustering import cluster_cities
from .dashboard_summary import build_dashboard_summary

# Load environment variables: check local .env first, then weather-api/.env if available
local_env = Path(".env")
if local_env.exists():
    load_dotenv(local_env)

weather_api_env = (
    Path(__file__).resolve().parents[2]
    / "weather-api"
    / ".env"
)
if weather_api_env.exists():
    load_dotenv(weather_api_env)

load_dotenv()

app = FastAPI(
    title="Weather ML Service",
    description="Machine learning service for the Weather Pattern Analyzer",
    version="0.1.0",
)

cors_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "*").strip()
if cors_origins_env == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

def get_connection():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        return psycopg.connect(db_url)

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "weather_db"),
        user=os.getenv("DB_USERNAME"),
        password=os.getenv("DB_PASSWORD"),
    )


@app.get("/health")
def health():
    return {
        "status": "ML service is running"
    }


@app.get("/weather-data")
def get_weather_data():
    query = """
        SELECT
            id,
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

            columns = [
                "id",
                "city",
                "temperature",
                "humidity",
                "pressure",
                "wind_speed",
                "cloud_percent",
                "rain1h",
                "observed_at",
            ]

    data = [dict(zip(columns, row)) for row in rows]

    return {
        "rows": len(data),
        "data": data,
    }
@app.get("/dataset/summary")
def dataset_summary():

    query = """
        SELECT
            id,
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        df = pd.read_sql_query(query, connection)

    return {
        "rows": int(len(df)),
        "cities": sorted(df["city"].dropna().unique().tolist()),
        "missing_values": {
            column: int(value)
            for column, value in df.isna().sum().items()
        },
        "duplicate_rows": int(df.duplicated().sum()),
        "date_range": {
            "start": str(df["observed_at"].min()),
            "end": str(df["observed_at"].max())
        },
        "rows_per_city": {
            city: int(count)
            for city, count in df["city"].value_counts().items()
        }
    }
@app.get("/dataset/eda")
def dataset_eda():

    query = """
        SELECT
            id,
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at
    """

    with get_connection() as connection:
        df = pd.read_sql_query(query, connection)

    if df.empty:
        return {
            "rows": 0,
            "message": "No weather data available yet."
        }

    # Make sure timestamp is treated as datetime
    df["observed_at"] = pd.to_datetime(df["observed_at"], utc=True)

    city_summary = (
        df.groupby("city")
        .agg(
            observations=("id", "count"),
            avg_temperature=("temperature", "mean"),
            min_temperature=("temperature", "min"),
            max_temperature=("temperature", "max"),
            avg_humidity=("humidity", "mean"),
            avg_pressure=("pressure", "mean"),
        )
        .round(2)
        .reset_index()
    )

    return {
        "rows": int(len(df)),
        "cities": sorted(df["city"].unique().tolist()),
        "date_range": {
            "start": df["observed_at"].min().isoformat(),
            "end": df["observed_at"].max().isoformat(),
        },
        "missing_values": {
            column: int(value)
            for column, value in df.isna().sum().items()
        },
        "overall": {
            "avg_temperature": round(float(df["temperature"].mean()), 2),
            "min_temperature": round(float(df["temperature"].min()), 2),
            "max_temperature": round(float(df["temperature"].max()), 2),
            "avg_humidity": round(float(df["humidity"].mean()), 2),
        },
        "city_summary": city_summary.to_dict(orient="records"),
    }
@app.get("/dataset/readiness")
def dataset_readiness():

    query = """
        SELECT
            city,
            COUNT(*) AS observations
        FROM weather_observation
        GROUP BY city
        ORDER BY city
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    city_counts = {
        city: int(count)
        for city, count in rows
    }

    minimum_required = 500

    ready = (
        len(city_counts) >= 5
        and all(
            count >= minimum_required
            for count in city_counts.values()
        )
    )

    problems = []

    if len(city_counts) < 5:
        problems.append("Fewer than 5 cities available")

    for city, count in city_counts.items():
        if count < minimum_required:
            problems.append(
                f"{city} has only {count} observations"
            )

    return {
        "ready_for_training": ready,
        "minimum_observations_per_city": minimum_required,
        "city_counts": city_counts,
        "problems": problems
    }
@app.get("/features/preview")
def feature_preview():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "rows": 0,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    preview_df = featured_df.tail(10).copy()

# Convert timestamps to JSON-safe strings
    preview_df["observed_at"] = (
        preview_df["observed_at"]
        .astype(str)
    )

    # Convert NaN / NaT to None
    preview_df = preview_df.astype(object).where(
        pd.notna(preview_df),
        None
    )

    return {
        "raw_rows": int(len(df)),
        "feature_rows": int(len(featured_df)),
        "columns": featured_df.columns.tolist(),
        "preview": preview_df.to_dict(orient="records"),
    }
@app.get("/features/quality")
def feature_quality():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "rows": 0,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    valid = featured_df[
        featured_df["target_valid"] == True
    ].copy()

    city_quality = {}

    for city, city_df in featured_df.groupby("city"):

        valid_city = city_df[
            city_df["target_valid"] == True
        ]

        city_quality[city] = {
            "raw_rows": int(len(city_df)),
            "valid_targets": int(len(valid_city)),
            "target_coverage_percent": round(
                len(valid_city) / len(city_df) * 100,
                2
            )
        }

    return {
        "raw_rows": int(len(featured_df)),
        "valid_target_rows": int(len(valid)),
        "target_coverage_percent": round(
            len(valid) / len(featured_df) * 100,
            2
        ),
        "city_quality": city_quality,
        "target_offset_minutes": {
            "min": (
                round(
                    float(valid["target_offset_minutes"].min()),
                    2
                )
                if not valid.empty else None
            ),
            "mean": (
                round(
                    float(valid["target_offset_minutes"].mean()),
                    2
                )
                if not valid.empty else None
            ),
            "max": (
                round(
                    float(valid["target_offset_minutes"].max()),
                    2
                )
                if not valid.empty else None
            )
        }
    }
@app.get("/features/coverage")
def feature_coverage():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {"rows": 0}

    featured = build_features(df)

    features = [
        "temperature_10m_ago",
        "temperature_30m_ago",
        "temperature_60m_ago",
        "humidity_60m_ago",
        "pressure_60m_ago",
        "target_temperature_1h",
    ]

    result = {}

    for feature in features:
        valid_count = int(featured[feature].notna().sum())

        result[feature] = {
            "valid_rows": valid_count,
            "coverage_percent": round(
                valid_count / len(featured) * 100,
                2
            )
        }

    return {
        "total_rows": int(len(featured)),
        "features": result
    }
@app.get("/dataset/training-preview")
def training_preview():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "raw_rows": 0,
            "training_rows": 0,
            "message": "No weather data available."
        }

    featured = build_features(df)

    feature_columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "hour",
        "day_of_week",
        "temperature_10m_ago",
        "temperature_30m_ago",
        "target_temperature_1h",
    ]

    training = featured[
        featured["target_valid"] == True
    ].copy()

    training = training.dropna(
        subset=[
            "temperature_10m_ago",
            "temperature_30m_ago",
            "target_temperature_1h",
        ]
    )

    return {
        "raw_rows": int(len(featured)),
        "training_rows": int(len(training)),
        "cities": sorted(
            training["city"].unique().tolist()
        ),
        "features": feature_columns[:-1],
        "target": "target_temperature_1h",
        "preview": (
            training[
                feature_columns
            ]
            .tail(10)
            .astype(object)
            .where(
                pd.notna(
                    training[feature_columns].tail(10)
                ),
                None
            )
            .to_dict(orient="records")
        )
    }
@app.get("/ml/baseline")
def baseline_model():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    return evaluate_persistence_baseline(
        featured_df
    )
@app.get("/ml/linear-regression")
def linear_regression_model():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    return train_linear_regression(featured_df)
@app.get("/ml/random-forest")
def random_forest_model():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    return train_random_forest(
        featured_df
    )
@app.get("/ml/xgboost")
def xgboost_model():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    return train_xgboost(
        featured_df
    )
@app.get("/ml/compare")
def compare_ml_models():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    return compare_models(featured_df)
@app.get("/ml/readiness")
def ml_readiness():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return {
            "ready_for_training": False,
            "message": "No weather data available."
        }

    df["observed_at"] = pd.to_datetime(
        df["observed_at"],
        utc=True
    )

    featured = build_features(df)

    training_features = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "hour",
        "day_of_week",
        "temperature_10m_ago",
        "temperature_30m_ago",
        "target_temperature_1h",
    ]

    usable_training = featured[
        featured["target_valid"] == True
    ].dropna(
        subset=training_features
    )

    now = pd.Timestamp.now(tz="UTC")

    recent = df[
        df["observed_at"] >= now - pd.Timedelta(hours=2)
    ]

    city_stats = {}

    for city, city_df in df.groupby("city"):

        city_featured = featured[
            featured["city"] == city
        ]

        city_training = city_featured[
            city_featured["target_valid"] == True
        ].dropna(
            subset=training_features
        )

        city_recent = recent[
            recent["city"] == city
        ]

        latest = city_df["observed_at"].max()

        city_stats[city] = {
            "total_rows": int(len(city_df)),
            "rows_last_2h": int(len(city_recent)),
            "valid_targets": int(
                city_featured["target_valid"].sum()
            ),
            "usable_training_rows": int(
                len(city_training)
            ),
            "latest_observation": latest.isoformat(),
        }

    minimum_training_rows = 100
    minimum_training_rows_per_city = 20
    active_window_minutes = 30

    city_training_counts = {
        city: int(
            len(
                usable_training[
                    usable_training["city"] == city
                ]
            )
        )
        for city in sorted(
            featured["city"].dropna().unique()
        )
    }

    latest_by_city = {
        city: df[df["city"] == city]["observed_at"].max()
        for city in df["city"].dropna().unique()
    }

    active_cities = {
        city: (
            latest is not None
            and (now - latest).total_seconds() <= active_window_minutes * 60
        )
        for city, latest in latest_by_city.items()
    }

    ready = (
        len(usable_training) >= minimum_training_rows
        and all(
            count >= minimum_training_rows_per_city
            for count in city_training_counts.values()
        )
        and all(active_cities.values())
    )

    return {
        "ready_for_training": ready,
        "minimum_training_rows_per_city": minimum_training_rows_per_city,
        "training_rows_per_city": city_training_counts,
        "active_cities": active_cities,
        "total_rows": int(len(df)),
        "valid_target_rows": int(
            featured["target_valid"].sum()
        ),
        "usable_training_rows": int(
            len(usable_training)
        ),
        "target_coverage_percent": round(
            (
                featured["target_valid"].sum()
                / len(featured)
            ) * 100,
            2
        ),
        "city_statistics": city_stats,
    }
@app.get("/ml/explainability/random-forest")
def explain_random_forest():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns,
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available.",
        }

    featured_df = build_features(df)

    return random_forest_feature_importance(
        featured_df,
    )
@app.get("/ml/evaluation/random-forest")
def random_forest_evaluation():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns,
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available.",
        }

    featured_df = build_features(df)

    return evaluate_random_forest(
        featured_df,
    )
@app.get("/ml/evaluation/summary")
def model_evaluation_summary():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns,
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available."
        }

    featured_df = build_features(df)

    return compare_models(
        featured_df
    )
@app.get("/ml/anomalies")
def weather_anomalies():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns,
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available.",
        }

    return detect_anomalies(df)
@app.get("/ml/clusters")
def weather_clusters():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns,
    )

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available.",
        }

    return cluster_cities(df)
@app.get("/ml/dashboard-summary")
def dashboard_summary():

    query = """
        SELECT
            city,
            temperature,
            humidity,
            pressure,
            wind_speed,
            cloud_percent,
            rain1h,
            observed_at
        FROM weather_observation
        ORDER BY observed_at ASC
    """

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    columns = [
        "city",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "cloud_percent",
        "rain1h",
        "observed_at",
    ]

    df = pd.DataFrame(
        rows,
        columns=columns,
    )

    return build_dashboard_summary(df)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8001))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)