import pandas as pd

from .anomaly import detect_anomalies
from .clustering import cluster_cities
from .features import build_features
from .model_comparison import compare_models
from .training_data import prepare_training_data


def build_dashboard_summary(
    df: pd.DataFrame,
) -> dict:

    if df.empty:
        return {
            "ready": False,
            "message": "No weather data available.",
        }

    df = df.copy()

    df["observed_at"] = pd.to_datetime(
        df["observed_at"],
        utc=True,
    )

    # -------------------------------------------------
    # Collection overview
    # -------------------------------------------------

    now = pd.Timestamp.now(tz="UTC")

    recent = df[
        df["observed_at"]
        >= now - pd.Timedelta(hours=2)
    ]

    latest_by_city = {}

    for city, city_df in df.groupby("city"):

        latest = city_df["observed_at"].max()

        latest_by_city[city] = {
            "latest_observation": latest.isoformat(),
            "rows_last_2h": int(
                len(
                    recent[
                        recent["city"] == city
                    ]
                )
            ),
        }

    # -------------------------------------------------
    # Feature engineering
    # -------------------------------------------------

    featured = build_features(df)

    # -------------------------------------------------
    # Training readiness
    # -------------------------------------------------

    prepared = prepare_training_data(
        featured
    )

    training_readiness = {
        "ready": prepared["ready"],
        "usable_training_rows": int(
            len(prepared.get("data", []))
            if prepared.get("ready")
            else prepared.get(
                "usable_rows",
                0,
            )
        ),
        "rows_per_city": prepared.get(
            "rows_per_city",
            {},
        ),
        "message": prepared.get(
            "message",
            "Training data is ready.",
        ),
    }

    # -------------------------------------------------
    # Model evaluation
    # -------------------------------------------------

    if prepared["ready"]:
        model_evaluation = (
            compare_models(featured)
        )
    else:
        model_evaluation = {
            "ready": False,
            "message": (
                "Model comparison is waiting "
                "for sufficient training data."
            ),
        }

    # -------------------------------------------------
    # Anomaly detection
    # -------------------------------------------------

    anomaly_result = detect_anomalies(
        df
    )

    anomaly_summary = {
        "ready": anomaly_result.get(
            "ready",
            False,
        ),
        "total_anomalies": int(
            len(
                anomaly_result.get(
                    "anomalies",
                    [],
                )
            )
        ),
        "city_results": anomaly_result.get(
            "city_results",
            {},
        ),
    }

    # -------------------------------------------------
    # City clustering
    # -------------------------------------------------

    cluster_result = cluster_cities(
        df
    )

    clustering_summary = {
        "ready": cluster_result.get(
            "ready",
            False,
        ),
        "method": cluster_result.get(
            "method",
            "K-Means",
        ),
        "clusters": cluster_result.get(
            "clusters",
            0,
        ),
        "silhouette_score": cluster_result.get(
            "silhouette_score",
            None,
        ),
        "cities": cluster_result.get(
            "cities",
            [],
        ),
    }

    return {
        "ready": True,

        "dataset": {
            "total_rows": int(len(df)),
            "cities": sorted(
                df["city"]
                .dropna()
                .unique()
                .tolist()
            ),
            "date_range": {
                "start": (
                    df["observed_at"]
                    .min()
                    .isoformat()
                ),
                "end": (
                    df["observed_at"]
                    .max()
                    .isoformat()
                ),
            },
        },

        "collection": {
            "recent_window": "2 hours",
            "cities": latest_by_city,
        },

        "training": training_readiness,

        "model_evaluation": model_evaluation,

        "anomalies": anomaly_summary,

        "clustering": clustering_summary,
    }