from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from supabase import create_client, Client
from app.config import settings

security = HTTPBearer()

def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.algorithm],
            options={"verify_aud": False}
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Provjeri ulogu iz baze
    result = supabase.table("user_roles").select("role").eq("user_id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="No role assigned")

    return {"user_id": user_id, "role": result.data["role"]}

async def require_driver(user=Depends(get_current_user)):
    if user["role"] != "driver":
        raise HTTPException(status_code=403, detail="Driver access only")
    return user