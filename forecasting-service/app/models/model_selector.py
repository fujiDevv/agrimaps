"""
Model Selection Logic
Decides between ARIMA and SARIMA per commodity based on
seasonal decomposition and stationarity tests.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from ..validation.stationarity import StationarityTester
from ..validation.seasonal_decomp import SeasonalDecomposer
from .arima_model import ARIMAModel
from .sarima_model import SARIMAModel
from ..config import CONFIDENCE_LEVEL, MIN_FILL_RATE, MAX_CV


class ModelSelector:
    def __init__(self):
        self.stationarity_tester = StationarityTester()
        self.seasonal_decomposer = SeasonalDecomposer(period=52)

    def check_eligibility(self, series: pd.Series) -> dict:
        """
        Check if a commodity meets minimum data quality thresholds:
        - At least 3 years (156 weeks) of data
        - Minimum 80% fill rate
        - Coefficient of variation below 50%
        """
        total = len(series)
        non_null = series.notna().sum()
        fill_rate = non_null / total if total > 0 else 0
        cv = series.std() / series.mean() if series.mean() > 0 else float("inf")

        eligible = (
            total >= 156
            and fill_rate >= MIN_FILL_RATE
            and cv < MAX_CV
        )

        reasons = []
        if total < 156:
            reasons.append(f"Insufficient data: {total} weeks (need ≥156)")
        if fill_rate < MIN_FILL_RATE:
            reasons.append(f"Fill rate too low: {fill_rate:.1%} (need ≥{MIN_FILL_RATE:.0%})")
        if cv >= MAX_CV:
            reasons.append(f"Price too volatile: CV={cv:.1%} (need <{MAX_CV:.0%})")

        return {
            "eligible": eligible,
            "total_weeks": total,
            "fill_rate": round(fill_rate, 4),
            "coefficient_of_variation": round(cv, 4),
            "reasons": reasons,
        }

    def select_and_fit(
        self, series: pd.Series, commodity_name: str = "Unknown"
    ) -> dict:
        """
        Full model selection pipeline:
        1. Check eligibility
        2. Test stationarity → determine d
        3. Test seasonality → choose ARIMA or SARIMA
        4. Fit model with best parameters
        5. Walk-forward validation

        Returns comprehensive result dict.
        """
        # Step 1: Eligibility
        eligibility = self.check_eligibility(series)
        if not eligibility["eligible"]:
            return {
                "success": False,
                "commodity": commodity_name,
                "reason": "Eligibility check failed",
                "details": eligibility,
            }

        # Clean the series (remove NaN for modeling)
        clean_series = series.dropna()

        # Step 2: Stationarity
        stationarity = self.stationarity_tester.determine_differencing(clean_series)
        d = stationarity["recommended_d"]

        # Step 3: Seasonality
        decomposition = self.seasonal_decomposer.decompose(clean_series)
        use_sarima = decomposition["has_seasonality"]

        # Step 4: Fit model
        try:
            if use_sarima:
                model = SARIMAModel(seasonal_period=52)
                fit_result = model.fit(clean_series, d=d, D=1)
            else:
                model = ARIMAModel()
                fit_result = model.fit(clean_series, d=d)
        except ValueError as e:
            return {
                "success": False,
                "commodity": commodity_name,
                "reason": str(e),
            }

        # Step 5: Walk-forward validation
        validation = self._walk_forward_validation(
            clean_series, use_sarima, d
        )

        return {
            "success": True,
            "commodity": commodity_name,
            "model_type": "SARIMA" if use_sarima else "ARIMA",
            "model_object": model,
            "parameters": fit_result,
            "stationarity": stationarity,
            "seasonality": decomposition,
            "validation": validation,
            "eligibility": eligibility,
        }

    def _walk_forward_validation(
        self,
        series: pd.Series,
        use_sarima: bool,
        d: int,
        n_splits: int = 5,
        test_size: int = 4,
    ) -> dict:
        """
        Walk-forward validation using expanding window.
        Computes RMSE, MAE, MAPE across n_splits folds.
        """
        total = len(series)
        min_train = max(104, total - n_splits * test_size)  # At least 2 years training

        errors = {"rmse": [], "mae": [], "mape": []}

        for i in range(n_splits):
            train_end = min_train + i * test_size
            test_end = min(train_end + test_size, total)

            if test_end <= train_end:
                break

            train = series.iloc[:train_end]
            test = series.iloc[train_end:test_end]

            try:
                if use_sarima:
                    model = SARIMAModel(seasonal_period=52)
                    model.fit(train, d=d, D=1)
                else:
                    model = ARIMAModel()
                    model.fit(train, d=d)

                forecast_result = model.forecast(steps=len(test))
                predicted = np.array(
                    [fv["predicted_price"] for fv in forecast_result["forecast_values"]]
                )
                actual = test.values

                rmse = np.sqrt(mean_squared_error(actual, predicted))
                mae = mean_absolute_error(actual, predicted)
                mape = np.mean(np.abs((actual - predicted) / actual)) * 100

                errors["rmse"].append(rmse)
                errors["mae"].append(mae)
                errors["mape"].append(mape)
            except Exception:
                continue

        if not errors["rmse"]:
            return {"valid": False, "reason": "Walk-forward validation failed"}

        return {
            "valid": True,
            "n_folds": len(errors["rmse"]),
            "rmse": round(np.mean(errors["rmse"]), 4),
            "mae": round(np.mean(errors["mae"]), 4),
            "mape": round(np.mean(errors["mape"]), 2),
            "rmse_std": round(np.std(errors["rmse"]), 4),
        }