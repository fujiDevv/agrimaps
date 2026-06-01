# Agrimaps API Documentation

This document describes the API endpoints provided by the Agrimaps backend and forecasting service.

## 1. Node.js Backend API

**Base URL**: `http://localhost:3000/api`

### Interactive Documentation
Interactive Swagger UI is available at: `http://localhost:3000/api/docs`

### Authentication
All protected routes require a JWT token in the `Authorization` header:
`Authorization: Bearer <token>`

---

### Endpoints Overview

#### Auth
- **POST** `/v1/auth/login`
  - Body: `{ "employeeId": "...", "password": "..." }`
  - Returns: JWT Token
- **GET** `/v1/auth/profile` *(Protected)*
  - Returns: User profile

#### Commodities
- **GET** `/v1/public/commodities`
  - Query: `category` (optional), `forecastableOnly` (optional)
- **GET** `/v1/public/commodities/prices/latest`
  - Query: `category` (optional)
- **GET** `/v1/public/commodities/:id/trend`
  - Query: `weeks` (optional)

#### Markets
- **GET** `/v1/public/markets`
  - Query: `city` (optional)
- **GET** `/v1/public/markets/geojson`
  - Query: `city` (optional)

#### Forecasts
- **GET** `/v1/public/forecasts`
  - Query: `horizon` (optional)
- **GET** `/v1/public/forecasts/:commodityId`
  - Query: `horizon` (optional)
- **POST** `/v1/admin/forecasts/generate/:commodityId` *(Protected: DA Monitoring, Admin)*
  - Body: `{ "horizon": 4 }`

#### Dashboard
- **GET** `/v1/public/dashboard`
- **GET** `/v1/admin/dashboard` *(Protected: DA Monitoring, Admin)*

#### Reports (Protected: DA Monitoring, Admin)
- **GET** `/v1/admin/reports/submission-progress`
  - Query: `dateFrom`, `dateTo`
- **GET** `/v1/admin/reports/market-coverage`
- **GET** `/v1/admin/reports/price-trend`
  - Query: `category`, `weeks`

#### Submissions (Protected)
- **POST** `/v1/submissions` *(Protected: DA Field, Monitoring, Admin)*
  - Body: `{ "marketId": "...", "items": [...], "location": {...} }`
- **GET** `/v1/submissions` *(Protected: DA Monitoring, Admin)*
- **PATCH** `/v1/submissions/:id/validate` *(Protected: DA Monitoring, Admin)*
  - Body: `{ "status": "validated" }`

---

## 2. Python Forecasting Service API

**Base URL**: `http://localhost:8000/api`

### Interactive Documentation
Interactive Swagger UI (FastAPI) is available at: `http://localhost:8000/docs`

### Endpoints Overview

- **GET** `/health`
  - Returns: `{"status": "ok"}`
- **POST** `/forecast`
  - Body: 
    ```json
    {
      "commodity_id": "uuid",
      "horizon": 4
    }
    ```
  - Returns: Forecast generated directly from the ARIMA/SARIMA model pipeline.
