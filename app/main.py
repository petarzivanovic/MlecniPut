from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routes, auth

app = FastAPI(title="Mlečni Put API", version="1.0.0")

# CORS - dozvoli Lovable frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://*.lovable.app",
        "http://localhost:5173",   # Lovable dev preview
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,   prefix="/api/v1/auth",   tags=["Auth"])
app.include_router(routes.router, prefix="/api/v1/routes", tags=["Routes"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "mlecni-put-backend"}