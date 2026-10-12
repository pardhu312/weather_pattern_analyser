import pandas as pd

from .baseline import evaluate_persistence_baseline
from .model_utils import train_linear_regression
from .random_forest import train_random_forest
from .xgboost_model import train_xgboost


def compare_models(df: pd.DataFrame) -> dict:

    results = {
        "persistence": evaluate_persistence_baseline(df),
        "linear_regression": train_linear_regression(df),
        "random_forest": train_random_forest(df),
        "xgboost": train_xgboost(df),
    }

    model_results = []

    for name, result in results.items():

        if result.get("ready") is True:

            metrics = result["metrics"]

            model_results.append({
                "model": result["model"],
                "MAE": metrics["MAE"],
                "RMSE": metrics["RMSE"],
                "R2": metrics["R2"],
                "train_rows": result["train_rows"],
                "test_rows": result["test_rows"],
            })

    # All four models must be ready before we
    # call the comparison a final evaluation.
    all_models_ready = all(
        result.get("ready") is True
        for result in results.values()
    )

    if not all_models_ready:

        return {
            "ready": False,
            "message": (
                "Final comparison is waiting for all "
                "models to become ready."
            ),
            "models": results,
        }

    comparison_df = pd.DataFrame(
        model_results
    )

    best_row = comparison_df.loc[
        comparison_df["RMSE"].idxmin()
    ]

    baseline_row = comparison_df[
        comparison_df["model"] == "Persistence Baseline"
    ].iloc[0]

    baseline_rmse = float(
        baseline_row["RMSE"]
    )

    best_rmse = float(
        best_row["RMSE"]
    )

    improvement_percent = (
        (baseline_rmse - best_rmse)
        / baseline_rmse
    ) * 100

    return {
        "ready": True,
        "evaluation_protocol": {
            "split": "Chronological per-city 80/20",
            "same_test_set_for_all_models": True,
            "metric_primary": "RMSE",
            "metrics": [
                "MAE",
                "RMSE",
                "R2",
            ],
        },
        "models": model_results,
        "best_model": {
            "model": best_row["model"],
            "RMSE": round(best_rmse, 4),
            "MAE": round(
                float(best_row["MAE"]),
                4,
            ),
            "R2": round(
                float(best_row["R2"]),
                4,
            ),
        },
        "baseline_comparison": {
            "baseline": "Persistence Baseline",
            "baseline_RMSE": round(
                baseline_rmse,
                4,
            ),
            "best_model_RMSE": round(
                best_rmse,
                4,
            ),
            "RMSE_improvement_percent": round(
                float(improvement_percent),
                2,
            ),
        },
    }