from fastapi import FastAPI


app = FastAPI(
    title="IRStore24 API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "irstore24-api",
    }
