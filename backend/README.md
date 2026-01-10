# Biometric Backend

Backend API for the Biometric biostatistical analysis application, built with **FastAPI** using a **layered architecture** (Service Pattern).

## 🏗️ Architecture

The backend follows a clean, scalable layered architecture:

```
backend/
├── app/
│   ├── api/v1/endpoints/     # FastAPI routers (HTTP layer)
│   ├── services/             # Business logic & calculations
│   ├── schemas/              # Pydantic models (validation)
│   ├── core/                 # Configuration & error handling
│   ├── internal/             # Session management
│   └── main.py               # Application entry point
```

### Design Principles

- **Separation of Concerns**: Routers handle HTTP, services handle logic
- **Type Safety**: Strict type hints throughout
- **Robust Error Handling**: Custom exceptions with standardized responses
- **Stateful Sessions**: UUID-based DataFrame storage with TTL
- **Extensibility**: Open-Closed Principle, easy to add features

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- pip

### Installation

1. **Create virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`

4. **View API documentation**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## 📡 API Endpoints

### Upload Dataset
```http
POST /api/v1/upload
Content-Type: multipart/form-data

Body: file (CSV or Excel)
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "data.csv",
  "metadata": {
    "rows": 100,
    "columns": 5,
    "column_names": ["age", "height", "weight", "gender", "score"],
    "dtypes": {...},
    "missing_values": {...}
  }
}
```

### Descriptive Statistics
```http
POST /api/v1/stats/descriptive
Content-Type: application/json

{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "columns": ["age", "height"]  // Optional, defaults to all numeric
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "analyzed_columns": ["age", "height"],
  "statistics": {
    "age": {
      "count": 100,
      "mean": 45.5,
      "median": 44.0,
      "std": 12.3,
      "variance": 151.29,
      "min": 18.0,
      "max": 75.0,
      "q1": 35.0,
      "q3": 56.0,
      "iqr": 21.0,
      "skewness": 0.12,
      "kurtosis": -0.45
    }
  }
}
```

## 🔧 Configuration

Configuration is managed via environment variables using `pydantic-settings`.

Create a `.env` file in the backend folder:

```env
# Application
APP_NAME=Biometric API
APP_VERSION=0.1.0
DEBUG=True

# CORS (add your frontend URLs)
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# File Upload
MAX_UPLOAD_SIZE_MB=50
ALLOWED_EXTENSIONS=[".csv", ".xlsx", ".xls"]

# Session Management
SESSION_TIMEOUT_MINUTES=60
```

## 📊 Key Components

### DataManager (`app/internal/data_manager.py`)
- Singleton pattern for centralized DataFrame storage
- Thread-safe operations
- Automatic session expiration (TTL)
- UUID-based session identification

### Services (`app/services/`)
- `UploadService`: File parsing (CSV/Excel) with encoding detection
- `DescriptiveService`: Statistical calculations (Pandas, NumPy, SciPy)
- **No business logic in routers** - all in services

### Error Handling (`app/core/errors.py`)
- Custom exception hierarchy
- Centralized error handlers
- Consistent JSON error responses

## 🔮 Future Enhancements

### Authentication (JWT)
```python
# TODO: Implement in app/core/auth.py
# - JWT token generation/validation
# - Protected routes with dependencies
```

### Database (SQLAlchemy)
```python
# TODO: Implement in app/db/ and app/models/
# - PostgreSQL for user data
# - Persistent DataFrame storage
# - SQLAlchemy ORM models
```

### Additional Statistical Modules
- Hypothesis testing (t-test, ANOVA, chi-square)
- Survival analysis (Kaplan-Meier, Cox regression)
- Data cleaning operations

## 🧪 Testing

Run the server and test with:

```bash
# Health check
curl http://localhost:8000/health

# Upload sample file
curl -X POST "http://localhost:8000/api/v1/upload" \
  -F "file=@sample_data.csv"
```

## 📝 Development Guidelines

1. **Type Hints**: Always use strict typing
2. **Docstrings**: Document all classes and methods
3. **Error Handling**: Use custom exceptions, not generic ones
4. **Service Pattern**: Keep routers thin, logic in services
5. **Validation**: Use Pydantic models for all inputs/outputs

## 📄 License

Part of the Biometric project.
