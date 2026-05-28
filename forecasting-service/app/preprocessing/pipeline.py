"""
Unified Data Preprocessing Pipeline
Applies canonicalization, imputation, and outlier detection
in the correct order of operations.
"""

import pandas as pd
from .canonicalization import CommodityCanonicalizer
from .imputation import PriceImputer
from .outlier_detection import OutlierDetector
from ..config import MAX_IMPUTE_GAP, IQR_MULTIPLIER


class PreprocessingPipeline:
    def __init__(self):
        self.canonicalizer = CommodityCanonicalizer()
        self.imputer = PriceImputer(max_gap=MAX_IMPUTE_GAP)
        self.outlier_detector = OutlierDetector(multiplier=IQR_MULTIPLIER)

    def process(
        self, df: pd.DataFrame, price_col: str = "retail_price"
    ) -> dict:
        """
        Run the full preprocessing pipeline:
        1. Canonicalize commodity names
        2. Ensure complete weekly date range (fill gaps)
        3. Detect and flag outliers (BEFORE imputation)
        4. Impute missing values (forward-fill, up to max_gap)

        Returns:
            dict with 'data' (processed DataFrame) and 'report' (pipeline stats)
        """
        report = {}

        # Step 1: Canonicalize
        if "commodity_name" in df.columns:
            df["commodity_name_raw"] = df["commodity_name"]
            df["commodity_name"] = df["commodity_name"].apply(
                self.canonicalizer.canonicalize
            )
            report["canonicalization"] = {
                "unique_raw": df["commodity_name_raw"].nunique(),
                "unique_canonical": df["commodity_name"].nunique(),
            }

        # Step 2: Ensure complete weekly date range
        if "week_start_date" in df.columns:
            df["week_start_date"] = pd.to_datetime(df["week_start_date"])
            full_range = pd.date_range(
                start=df["week_start_date"].min(),
                end=df["week_start_date"].max(),
                freq="W-MON",
            )
            original_len = len(df)
            df = df.set_index("week_start_date").reindex(full_range).reset_index()
            df.rename(columns={"index": "week_start_date"}, inplace=True)
            report["date_range"] = {
                "weeks_in_range": len(full_range),
                "original_records": original_len,
                "gaps_filled": len(full_range) - original_len,
            }

        # Step 3: Outlier detection (before imputation, so outliers
        # in existing data are flagged and won't corrupt imputation)
        df = self.outlier_detector.detect(df, price_col)
        report["outlier_detection"] = self.outlier_detector.get_report(df, price_col)

        # Step 4: Imputation (after outlier flagging)
        df = self.imputer.impute(df, price_col)
        report["imputation"] = self.imputer.get_imputation_report(
            df[price_col] if price_col in df.columns else pd.Series(dtype=float),
            df[price_col],
        )

        # Compute fill rate
        total = len(df)
        valid = df[price_col].notna().sum()
        report["fill_rate"] = round(valid / total, 4) if total > 0 else 0

        return {"data": df, "report": report}