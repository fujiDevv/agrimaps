"""
Walk-Forward Validation Module
Standalone module for independent validation runs if needed.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error


def walk_forward_validate(
    model_class,
    series: pd.Series,
    n_splits: int = 5,
    test_size: int = 4,
    min_train_size: int = 104,
    **model_kwargs,
) -> dict:
    """
    Generic walk-forward validation function.

    Parameters:
        model_class: ARIMAModel or SARIMAModel class
        series: Full price series
        n_splits: Number of validation folds
        test_size: Weeks per test fold
        min_train_size: Minimum training observations
        **model_kwargs: Additional arguments for model.fit()

    Returns:
        Validation metrics (RMSE, MAE, MAPE) averaged across folds
    """
    total = len(series)
    train_start_size = max(min_train_size, total - n_splits * test_size)

    all_errors = []

    for i in range(n_splits):
        train_end = train_start_size + i * test_size
        test_end = min(train_end + test_size, total)

        if test_end <= train_end:
            break

        train = series.iloc[:train_end]
        actual = series.iloc[train_end:test_end].values

        try:
            model = model_class(**{
                k: v for k, v in model_kwargs.items()
                if k in ["max_p", "max_d", "max_q", "max_P", "max_D", "max_Q", "seasonal_period"]
            })
            model.fit(train, d=model_kwargs.get("d", 1))

            forecast = model.forecast(steps=len(actual))
            predicted = np.array(
                [fv["predicted_price"] for fv in forecast["forecast_values"]]
            )

            all_errors.append({
                "fold": i + 1,
                "train_size": len(train),
                "test_size": len(actual),
                "rmse": np.sqrt(mean_squared_error(actual, predicted)),
                "mae": mean_absolute_error(actual, predicted),
                "mape": np.mean(np.abs((actual - predicted) / actual)) * 100,
            })
        except Exception as e:
            all_errors.append({
                "fold": i + 1,
                "error": str(e),
            })

    successful = [e for e in all_errors if "rmse" in e]

    if not successful:
        return {"valid": False, "reason": "All folds failed", "details": all_errors}

    return {
        "valid": True,
        "n_folds": len(successful),
        "rmse": round(np.mean([e["rmse"] for e in successful]), 4),
        "mae": round(np.mean([e["mae"] for e in successful]), 4),
        "mape": round(np.mean([e["mape"] for e in successful]), 2),
        "fold_details": all_errors,
    }