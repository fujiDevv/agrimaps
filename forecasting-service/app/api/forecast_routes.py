"""FastAPI routes for the forecasting microservice."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import pandas as pd

from ..models.model_selector import ModelSelector
from ..preprocessing.pipeline import PreprocessingPipeline
from ..utils.metrics import calculate_all

router = APIRouter(prefix="/api", tags=["forecast"])


# ── Request / Response Models ─────────────────────────

class PricePoint(BaseModel):
    date: str
    price: float


class ForecastRequest(BaseModel):
    commodity_id: str
    commodity_name: str
    category: str
    price_series: List[PricePoint]
    horizon_weeks: int = Field(default=4, ge=1, le=52)


class ForecastResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    commodity_id: str
    commodity_name: str
    model_type: str
    model_parameters: dict
    forecast_values: list
    confidence_level: float
    metrics: dict
    is_low_confidence: bool
    confidence_reason: Optional[str]
    training_start: str
    training_end: str
    preprocessing_report: dict


# ── Forecast Endpoint ─────────────────────────────────

@router.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate ARIMA or SARIMA forecast for a single commodity.
    Accepts historical weekly price data and returns forecast
    with confidence intervals.
    """
    # Convert to pandas DataFrame
    df = pd.DataFrame([{"week_start_date": p.date, "retail_price": p.price} for p in request.price_series])

    # Run preprocessing pipeline
    pipeline = PreprocessingPipeline()
    processed = pipeline.process(df)
    df_processed = processed["data"]

    # Extract clean series for modeling
    series = df_processed["retail_price"].astype(float)

    # Select and fit model
    selector = ModelSelector()
    result = selector.select_and_fit(series, request.commodity_name)

    if not result["success"]:
        raise HTTPException(
            status_code=422,
            detail={
                "message": f"Model fitting failed for {request.commodity_name}",
                "reason": result.get("reason"),
                "details": result.get("details"),
            },
        )

    # Generate forecast
    model = result["model_object"]
    forecast = model.forecast(
        steps=request.horizon_weeks,
        alpha=1 - 0.95,  # 95% confidence
    )

    # Determine confidence flagging
    is_low_confidence = False
    confidence_reason = None

    if result["validation"]["valid"]:
        mape = result["validation"]["mape"]
        if mape > 20:
            is_low_confidence = True
            confidence_reason = f"High validation MAPE ({mape}%) — forecast may be unreliable"

    if processed["report"].get("fill_rate", 1.0) < 0.85:
        is_low_confidence = True
        confidence_reason = (confidence_reason + "; " if confidence_reason else "") + f"Data fill rate below threshold ({processed['report']['fill_rate']:.1%})"

    return ForecastResponse(
        commodity_id=request.commodity_id,
        commodity_name=request.commodity_name,
        model_type=result["model_type"],
        model_parameters=result["parameters"],
        forecast_values=forecast["forecast_values"],
        confidence_level=0.95,
        metrics=result.get("validation", {}),
        is_low_confidence=is_low_confidence,
        confidence_reason=confidence_reason,
        training_start=str(df_processed["week_start_date"].iloc[0].date())
            if hasattr(df_processed["week_start_date"].iloc[0], "date")
            else str(df_processed["week_start_date"].iloc[0]),
        training_end=str(df_processed["week_start_date"].iloc[-1].date())
            if hasattr(df_processed["week_start_date"].iloc[-1], "date")
            else str(df_processed["week_start_date"].iloc[-1]),
        preprocessing_report=processed["report"],
    )