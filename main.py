from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import fasilitas
from database import db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database pool
    await db.connect()
    yield
    # Shutdown: Close database pool
    await db.disconnect()

app = FastAPI(
    title="WebGIS API - Tugas Praktikum 7",
    description="API untuk mengakses data spasial dari database PostGIS",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    return {"message": "Selamat datang di API WebGIS Fasilitas Publik"}

# Include routers
app.include_router(fasilitas.router)

# Special handling for /geojson to match assignment path exactly if /fasilitas/geojson is not desired
# Actually the assignment says GET geojson, usually /geojson
@app.get("/geojson", tags=["Spatial"])
async def get_geojson_root(pool=fasilitas.Depends(fasilitas.get_db)):
    return await fasilitas.get_geojson(pool)
