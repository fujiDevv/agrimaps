"""
Seasonal Decomposition
Determines whether a commodity exhibits statistically significant
seasonal patterns → SARIMA vs ARIMA selection.
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.seasonal import seasonal_decompose
from scipy import stats


class SeasonalDecomposer:
    def __init__(self, period: int = 52):
        """
        period=52 for weekly data with annual seasonality
        """
        self.period = period

    def decompose(self, series: pd.Series) -> dict:
        """
        Perform seasonal decomposition and test significance.

        Returns:
            dict with decomposition results and seasonality determination
        """
        if len(series) < self.period * 2:
            return {
                "has_seasonality": False,
                "reason": f"Insufficient data: {len(series)} < {self.period * 2} required for decomposition",
                "seasonal_strength": 0,
            }

        decomp = seasonal_decompose(
            series.dropna(), model="additive", period=self.period
        )

        seasonal = decomp.seasonal.dropna()
        residual = decomp.resid.dropna()

        # Test if seasonal component is statistically significant
        # Compare variance of seasonal component to variance of residuals
        seasonal_var = np.var(seasonal)
        residual_var = np.var(residual.dropna())

        if residual_var == 0:
            f_stat = float("inf")
            p_value = 0.0
        else:
            f_stat = seasonal_var / residual_var
            # Approximate p-value using F-distribution
            df1 = self.period - 1
            df2 = len(residual.dropna()) - self.period
            if df2 > 0:
                p_value = 1 - stats.f.cdf(f_stat, df1, df2)
            else:
                p_value = 1.0

        # Seasonal strength: proportion of total variance explained by seasonal component
        total_var = seasonal_var + residual_var
        seasonal_strength = seasonal_var / total_var if total_var > 0 else 0

        has_seasonality = p_value < 0.05 and seasonal_strength > 0.1

        return {
            "has_seasonality": has_seasonality,
            "seasonal_strength": round(seasonal_strength, 4),
            "f_statistic": round(f_stat, 4) if np.isfinite(f_stat) else None,
            "p_value": round(p_value, 6),
            "seasonal_period": self.period,
            "recommended_model": "SARIMA" if has_seasonality else "ARIMA",
            "decomposition": {
                "trend": decomp.trend.dropna().tolist(),
                "seasonal": seasonal.tolist(),
                "residual": residual.dropna().tolist(),
            },
        }