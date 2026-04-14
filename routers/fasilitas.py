from fastapi import APIRouter, HTTPException, Query, Depends
from models import FasilitasCreate
from database import get_db
import json

router = APIRouter(prefix="/fasilitas", tags=["Fasilitas"])

@router.get("/")
async def get_all(pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, nama, jenis, alamat FROM fasilitas_publik")
        return [dict(r) for r in rows]


@router.get("/geojson", tags=["Spatial"])
async def get_geojson(pool=Depends(get_db)):
    query = """
    SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', jsonb_agg(features.feature)
    )
    FROM (
      SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         id,
        'geometry',   ST_AsGeoJSON(geom)::jsonb,
        'properties', to_jsonb(inputs) - 'id' - 'geom'
      ) AS feature
      FROM (SELECT * FROM fasilitas_publik) inputs
    ) features;
    """
    async with pool.acquire() as conn:
        result = await conn.fetchval(query)
        if result is None:
             return {"type": "FeatureCollection", "features": []}
        return json.loads(result)

@router.post("/")
async def create_fasilitas(item: FasilitasCreate, pool=Depends(get_db)):
    query = """
    INSERT INTO fasilitas_publik (nama, jenis, alamat, geom)
    VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))
    RETURNING id
    """
    async with pool.acquire() as conn:
        new_id = await conn.fetchval(query, item.nama, item.jenis, item.alamat, item.longitude, item.latitude)
        return {"status": "success", "id": new_id}

@router.get("/nearby", tags=["Spatial"])
async def get_nearby(lat: float, lon: float, radius: float = 1000, pool=Depends(get_db)):
    query = """
    SELECT id, nama, jenis, ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) as jarak
    FROM fasilitas_publik
    WHERE ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
    ORDER BY jarak ASC
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, lon, lat, radius)
        return [dict(r) for r in rows]

@router.get("/{id}")
async def get_by_id(id: int, pool=Depends(get_db)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, nama, jenis, alamat FROM fasilitas_publik WHERE id = $1", id)
        if not row:
            raise HTTPException(status_code=404, detail="Data tidak ditemukan")
        return dict(row)
