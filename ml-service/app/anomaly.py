import pandas as pd

from sklearn.ensemble import IsolationForest


ANOMALY_FEATURES = [
    "temperature",
    "humidity",
    "pressure",
    "wind_speed",
    "cloud_percent",
    "rain1h",
]


MIN_CITY_ROWS = 20


def detect_anomalies(df: pd.DataFrame) -> dict:

    data = df.copy()

    data["observed_at"] = pd.to_datetime(
        data["observed_at"],
        utc=True,
    )

    data = data.sort_values(
        ["city", "observed_at"]
    ).reset_index(drop=True)

    city_results = {}
    all_anomalies = []

    for city, city_df in data.groupby("city"):

        city_df = city_df.copy()

        city_df = city_df.dropna(
            subset=ANOMALY_FEATURES
        )

        if len(city_df) < MIN_CITY_ROWS:
            city_results[city] = {
                "ready": False,
                "rows": int(len(city_df)),
                "message": (
                    f"At least {MIN_CITY_ROWS} rows "
                    "are required for anomaly detection."
                ),
            }
            continue

        model = IsolationForest(
            n_estimators=300,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )

        X = city_df[ANOMALY_FEATURES]

        model.fit(X)

        predictions = model.predict(X)

        # Isolation Forest decision_function:
        # higher = more normal
        # lower = more anomalous
        raw_scores = model.decision_function(X)

        city_df["anomaly"] = (
            predictions == -1
        )

        city_df["anomaly_score"] = (
            -raw_scores
        )

        city_df["observed_at"] = (
            city_df["observed_at"]
            .astype(str)
        )

        anomaly_rows = city_df[
            city_df["anomaly"]
        ].copy()

        city_results[city] = {
            "ready": True,
            "rows": int(len(city_df)),
            "anomaly_count": int(
                len(anomaly_rows)
            ),
            "anomaly_rate_percent": round(
                len(anomaly_rows)
                / len(city_df)
                * 100,
                2,
            ),
        }

        for _, row in anomaly_rows.iterrows():

            all_anomalies.append({
                "city": row["city"],
                "observed_at": row["observed_at"],
                "temperature": float(
                    row["temperature"]
                ),
                "humidity": float(
                    row["humidity"]
                ),
                "pressure": float(
                    row["pressure"]
                ),
                "wind_speed": float(
                    row["wind_speed"]
                ),
                "cloud_percent": float(
                    row["cloud_percent"]
                ),
                "rain1h": float(
                    row["rain1h"]
                ),
                "anomaly_score": round(
                    float(row["anomaly_score"]),
                    6,
                ),
            })

    all_anomalies.sort(
        key=lambda row: row["anomaly_score"],
        reverse=True,
    )

    return {
        "ready": len(all_anomalies) > 0,
        "method": "Isolation Forest",
        "contamination": 0.05,
        "features": ANOMALY_FEATURES,
        "city_results": city_results,
        "anomalies": all_anomalies,
    }