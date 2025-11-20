from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.services.database import create_db_and_tables

app = FastAPI(
    title="Real-Time Face Attendance Backend",
    description="A FastAPI backend for real-time face attendance using YOLOv8n-face and ArcFace.",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],  # Allows all method
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to the Real-Time Face Attendance API! Visit /docs for API documentation."}
