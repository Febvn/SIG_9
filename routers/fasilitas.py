from fastapi import APIRouter, HTTPException, Query, Depends, status
from models import FasilitasCreate, FasilitasUpdate
from database import get_db
from routers.auth import get_current_user
import json

router = APIRouter(prefix="/fasilitas", tags=["Fasilitas"])

@router.get("/")
async def get_all(pool=Depends(get_db)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, nama, jenis, alamat, ST_X(geom) as longitude, ST_Y(geom) as latitude FROM fasilitas_publik")
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

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_fasilitas(item: FasilitasCreate, pool=Depends(get_db), current_user=Depends(get_current_user)):
    query = """
    INSERT INTO fasilitas_publik (nama, jenis, alamat, geom)
    VALUES ($1, $2, $3, ST_SetSRID(ST_Point($4, $5), 4326))
    RETURNING id
    """
    async with pool.acquire() as conn:
        new_id = await conn.fetchval(query, item.nama, item.jenis, item.alamat, item.longitude, item.latitude)
        return {"status": "success", "id": new_id, "message": "Fasilitas berhasil ditambahkan"}

@router.put("/{id}")
async def update_fasilitas(id: int, item: FasilitasUpdate, pool=Depends(get_db), current_user=Depends(get_current_user)):
    async with pool.acquire() as conn:
        # Check if exists
        exists = await conn.fetchval("SELECT 1 FROM fasilitas_publik WHERE id = $1", id)
        if not exists:
            raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        
        # Build dynamic update
        updates = []
        params = [id]
        idx = 2
        
        if item.nama:
            updates.append(f"nama = ${idx}")
            params.append(item.nama)
            idx += 1
        if item.jenis:
            updates.append(f"jenis = ${idx}")
            params.append(item.jenis)
            idx += 1
        if item.alamat:
            updates.append(f"alamat = ${idx}")
            params.append(item.alamat)
            idx += 1
        if item.longitude is not None and item.latitude is not None:
            updates.append(f"geom = ST_SetSRID(ST_Point(${idx}, ${idx+1}), 4326)")
            params.extend([item.longitude, item.latitude])
            idx += 2
            
        if not updates:
            return {"message": "No changes made"}
            
        query = f"UPDATE fasilitas_publik SET {', '.join(updates)} WHERE id = $1"
        await conn.execute(query, *params)
        return {"status": "success", "message": "Fasilitas berhasil diperbarui"}

@router.delete("/{id}")
async def delete_fasilitas(id: int, pool=Depends(get_db), current_user=Depends(get_current_user)):
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM fasilitas_publik WHERE id = $1", id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        return {"status": "success", "message": "Fasilitas berhasil dihapus"}

@router.get("/nearby", tags=["Spatial"])
async def get_nearby(lat: float, lon: float, radius: float = 1000, pool=Depends(get_db)):
    query = """
    SELECT id, nama, jenis, alamat, ST_X(geom) as longitude, ST_Y(geom) as latitude,
           ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) as jarak
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
        row = await conn.fetchrow("SELECT id, nama, jenis, alamat, ST_X(geom) as longitude, ST_Y(geom) as latitude FROM fasilitas_publik WHERE id = $1", id)
        if not row:
            raise HTTPException(status_code=404, detail="Data tidak ditemukan")
        return dict(row)
