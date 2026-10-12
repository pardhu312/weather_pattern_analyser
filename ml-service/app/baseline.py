import pandas as pd

from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
)

from .training_data import (
    FEATURES,
    TARGET,
    prepare_training_data,
)


def evaluate_persistence_baseline(
    df: pd.DataFrame,
) -> dict:

    prepared = prepare_training_data(df)

    if not prepared["ready"]:
        return {
            "ready": False,
            "message": prepared["message"],
            "usable_training_rows": prepared.get(
                "usable_rows",
                0,
            ),
            "rows_per_city": prepared.get(
                "rows_per_city",
                {},
            ),
        }

    train = prepared["train"]
    test = prepared["test"]

    # Persistence:
    # predict future temperature as current temperature
    y_true = test[TARGET]
    y_pred = test["temperature"]

    mae = mean_absolute_error(
        y_true,
        y_pred,
    )

    rmse = root_mean_squared_error(
        y_true,
        y_pred,
    )

    r2 = r2_score(
        y_true,
        y_pred,
    )

    return {
        "ready": True,
        "model": "Persistence Baseline",
        "total_usable_rows": int(
            len(prepared["data"])
        ),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "rows_per_city": prepared[
            "rows_per_city"
        ],
        "features_used": [
            "temperature"
        ],
        "metrics": {
            "MAE": round(float(mae), 4),
            "RMSE": round(float(rmse), 4),
            "R2": round(float(r2), 4),
        },
    }