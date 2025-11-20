from fastapi import APIRouter

from app.api.v1.endpoints import auth, students, recognition, cameras, attendance, livestream, google_auth, messages, dashboard

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(google_auth.router, prefix="/auth", tags=["google-auth"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(recognition.router, prefix="/recognition", tags=["recognition"])
api_router.include_router(livestream.router, prefix="/stream", tags=["livestream"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
