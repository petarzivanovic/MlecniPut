import httpx
from app.config import settings
from supabase import Client

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

async def geocode_address(address: str) -> tuple[float, float] | None:
    """Pretvori tekstualnu adresu u lat/lng koordinate."""
    # Dodaj Beograd kao kontekst za tačnije rezultate
    full_address = f"{address}, Beograd, Srbija"

    async with httpx.AsyncClient() as client:
        resp = await client.get(GEOCODE_URL, params={
            "address": full_address,
            "key": settings.google_maps_api_key,
            "region": "rs",
            "language": "sr"
        })
        data = resp.json()

    if data["status"] != "OK":
        return None

    loc = data["results"][0]["geometry"]["location"]
    return loc["lat"], loc["lng"]


async def ensure_geocoded_profile(user_id: str, supabase: Client):
    """Ako profil nema koordinate, geokodira adresu i upiše u bazu."""
    profile = supabase.table("profiles")\
        .select("address, latitude, longitude")\
        .eq("user_id", user_id).single().execute()

    if not profile.data:
        return None

    p = profile.data
    # Već ima koordinate
    if p.get("latitude") and p.get("longitude"):
        return p["latitude"], p["longitude"]

    # Treba geokodirati
    if not p.get("address"):
        return None

    coords = await geocode_address(p["address"])
    if not coords:
        return None

    lat, lng = coords
    supabase.table("profiles").update({
        "latitude": lat,
        "longitude": lng,
        "geocoded_at": "now()"
    }).eq("user_id", user_id).execute()

    return lat, lng


async def ensure_geocoded_farmer(farmer_id: str, supabase: Client):
    """Isto za mlekare iz partner_applications."""
    farmer = supabase.table("partner_applications")\
        .select("address, latitude, longitude")\
        .eq("id", farmer_id).single().execute()

    if not farmer.data:
        return None

    f = farmer.data
    if f.get("latitude") and f.get("longitude"):
        return f["latitude"], f["longitude"]

    if not f.get("address"):
        return None

    coords = await geocode_address(f["address"])
    if not coords:
        return None

    lat, lng = coords
    supabase.table("partner_applications").update({
        "latitude": lat,
        "longitude": lng,
        "geocoded_at": "now()"
    }).eq("id", farmer_id).execute()

    return lat, lng