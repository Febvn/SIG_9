import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def get_center():
    conn = await asyncpg.connect(DATABASE_URL)
    row = await conn.fetchrow("SELECT ST_X(geom) as lon, ST_Y(geom) as lat FROM fasilitas_publik LIMIT 1")
    print(f"CENTER: {row['lat']}, {row['lon']}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(get_center())
