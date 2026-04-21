from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    google_maps_api_key: str
    jwt_secret: str
    algorithm: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()