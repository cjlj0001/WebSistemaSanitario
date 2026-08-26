from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from . import models
from .database import engine
from .routers import aiController, authController, imageController, resultController, userController

try:
    models.Base.metadata.create_all(bind=engine)
except Exception as exc:
    # Log and continue — in development environments the DB may be unavailable.
    import traceback
    traceback.print_exc()

app = FastAPI()

origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imageController.router)
app.include_router(resultController.router)
app.include_router(userController.router)
app.include_router(aiController.router)
app.include_router(authController.router)

@app.get("/")
def root():
    return {"mensaje": "Backend funcionando correctamente"}
