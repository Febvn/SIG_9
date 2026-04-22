from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from database import get_db
from models import UserCreate, Token, TokenData
from auth_utils import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM
import asyncpg

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), pool=Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
        
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT username FROM users WHERE username = $1", token_data.username)
        if user is None:
            raise credentials_exception
        return user

@router.post("/register", response_model=Token)
async def register(user: UserCreate, pool=Depends(get_db)):
    hashed_password = get_password_hash(user.password)
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
                user.username, user.email, hashed_password
            )
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Username or Email already registered")

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), pool=Depends(get_db)):
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE username = $1", form_data.username)
        if not user or not verify_password(form_data.password, user['password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = create_access_token(data={"sub": user['username']})
        return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return {"username": current_user['username'], "status": "authenticated"}
