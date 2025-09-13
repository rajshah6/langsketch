# FastAPI Backend

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) package manager

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/taha-shahid1/burner.git
   cd backend
   ```

2. Install dependencies:
   ```bash
   uv sync
   ```

## Running the Application

### Development Mode

Start the development server with hot reload:

```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Base URL**: http://localhost:8000
- **Interactive API docs (Swagger)**: http://localhost:8000/docs
- **Alternative API docs (ReDoc)**: http://localhost:8000/redoc