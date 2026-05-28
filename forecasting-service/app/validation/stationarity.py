"""
Stationarity Testing using ADF and KPSS tests.
Determines whether differencing is needed for ARIMA/SARIMA fitting.
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import adfuller, kpss


class StationarityTester:
    def __init__(self, significance: float = 0.05):
        self.significance = significance

    def adf_test(self, series: pd.Series) -> dict:
        """
        Augmented Dickey-Fuller test.
        H0: Series has a unit root (non-stationary)
        Reject H0 → series is stationary
        """
        result = adfuller(series.dropna(), autolag="AIC")
        return {
            "test": "ADF",
            "statistic": round(result[0], 4),
            "p_value": round(result[1], 6),
            "lags_used": result[2],
            "critical_values": {
                k: round(v, 4) for k, v in result[4].items()
            },
            "is_stationary": result[1] < self.significance,
        }

    def kpss_test(self, series: pd.Series) -> dict:
        """
        KPSS test.
        H0: Series is stationary
        Reject H0 → series is non-stationary
        """
        result = kpss(series.dropna(), regression="c", nlags="auto")
        return {
            "test": "KPSS",
            "statistic": round(result[0], 4),
            "p_value": round(result[1], 6),
            "lags_used": result[2],
            "critical_values": {
                k: round(v, 4) for k, v in result[3].items()
            },
            "is_stationary": result[1] > self.significance,
        }

    def determine_differencing(self, series: pd.Series) -> dict:
        """
        Run both ADF and KPSS to determine the required order of differencing.
        Returns consensus recommendation.
        """
        adf = self.adf_test(series)
        kpss_result = self.kpss_test(series)

        # Consensus logic:
        # Both say stationary → d=0
        # ADF says stationary, KPSS says non-stationary → likely trend stationary, d=0 or 1
        # ADF says non-stationary, KPSS says stationary → rare, d=0
        # Both say non-stationary → d=1
        if adf["is_stationary"] and kpss_result["is_stationary"]:
            d = 0
        elif not adf["is_stationary"] and not kpss_result["is_stationary"]:
            d = 1
        elif adf["is_stationary"] and not kpss_result["is_stationary"]:
            d = 1  # Trend stationary → differencing helps
        else:
            d = 0

        return {
            "adf": adf,
            "kpss": kpss_result,
            "recommended_d": d,
        }