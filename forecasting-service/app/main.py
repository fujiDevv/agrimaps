"""FastAPI application entry point for the Agrimaps Forecasting Microservice."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.forecast_routes import router as forecast_router
from .config import LOG_LEVEL
import logging

logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))

app = FastAPI(
    title="Agrimaps Forecasting Service",
    description="ARIMA/SARIMA price forecasting microservice for NCR agricultural commodities",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "agrimaps-forecasting",
        "version": "1.0.0",
    }