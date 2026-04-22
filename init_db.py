import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def init_db():
    print("Initializing database...")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Create users table
        print("Creating users table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Ensure PostGIS extension
        print("Ensuring PostGIS extension...")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        
        # Create fasilitas_publik table if not exists
        print("Creating fasilitas_publik table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fasilitas_publik (
                id SERIAL PRIMARY KEY,
                nama VARCHAR(100) NOT NULL,
                jenis VARCHAR(50) NOT NULL,
                alamat TEXT,
                geom GEOMETRY(Point, 4326)
            );
        """)
        
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(init_db())
