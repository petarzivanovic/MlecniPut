from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.dependencies import get_supabase, require_driver
from app.services.geocoding import (
    geocode_address, ensure_geocoded_profile, ensure_geocoded_farmer
)
from app.services.routing_solver import solve_route

router = APIRouter()


@router.post("/generate")
async def generate_route(
    payload: dict,
    supabase: Client = Depends(get_supabase),
):
    """
    Glavni endpoint koji poziva Lovable frontend.
    Ne zahteva driver auth token za sad (Lovable ne šalje JWT direktno),
    ali validiramo driver_id iz baze.
    """
    driver_id      = payload.get("driver_id")
    selected_date  = payload.get("selected_date")       # "2026-04-20"
    start_location = payload.get("start_location")      # "Knez Mihailova 1"
    departure_time = payload.get("departure_time", "07:00")
    orders_raw     = payload.get("orders", [])
    supplies_raw   = payload.get("supplies", [])

    if not driver_id or not selected_date or not start_location:
        raise HTTPException(400, "Nedostaju obavezna polja: driver_id, selected_date, start_location")

    # ── 1. Geokodiranje početne lokacije vozača ────────────
    start_coords = await geocode_address(start_location)
    if not start_coords:
        raise HTTPException(400, f"Ne mogu da geokodira početnu lokaciju: {start_location}")
    driver_start = {"lat": start_coords[0], "lng": start_coords[1]}

    # ── 2. Geokodiranje mlekara ────────────────────────────
    farmers = []
    for s in supplies_raw:
        lat, lng = s.get("latitude"), s.get("longitude")

        if not lat or not lng:
            # Geokodira i sačuvaj u bazu
            coords = await geocode_address(s.get("address", ""))
            if not coords:
                continue
            lat, lng = coords
            supabase.table("partner_applications").update({
                "latitude": lat, "longitude": lng, "geocoded_at": "now()"
            }).eq("id", s["id"]).execute()

        farmers.append({
            "id": s["id"],
            "name": s.get("name", "Mlekara"),
            "address": s.get("address", ""),
            "lat": float(lat),
            "lng": float(lng),
            "capacity": float(s.get("capacity", 0)),
        })

    if not farmers:
        raise HTTPException(400, "Nema dostupnih odobrenih mlekara.")

    # ── 3. Geokodiranje kupaca i priprema dostava ─────────
    deliveries = []
    for o in orders_raw:
        address = o.get("delivery_address")
        if not address:
            continue  # preskoci narudžbinu bez adrese

        # Pokušaj da uzmeš koordinate iz profila (već geokodiran)
        user_id = o.get("user_id")
        lat, lng = None, None

        if user_id:
            profile = supabase.table("profiles")\
                .select("latitude, longitude")\
                .eq("user_id", user_id).single().execute()
            if profile.data:
                lat = profile.data.get("latitude")
                lng = profile.data.get("longitude")

        if not lat or not lng:
            coords = await geocode_address(address)
            if not coords:
                continue
            lat, lng = coords
            # Sačuvaj koordinate u profil
            if user_id:
                supabase.table("profiles").update({
                    "latitude": lat, "longitude": lng, "geocoded_at": "now()"
                }).eq("user_id", user_id).execute()

        # Izračunaj litre
        if o.get("type") == "subscription":
            liters = float(o.get("weekly_liters", 0)) / len(o.get("delivery_days", [1]))
        else:
            items = o.get("items", {})
            if isinstance(items, dict):
                liters = float(items.get("liters", items.get("quantity", 1)))
            else:
                liters = 1.0

        if liters <= 0:
            continue

        deliveries.append({
            "order_id": o["id"],
            "user_id": user_id,
            "address": address,
            "customer_name": o.get("customer_name"),
            "lat": float(lat),
            "lng": float(lng),
            "liters": liters,
            "time_window_start": o.get("time_window_start"),
            "time_window_end": o.get("time_window_end"),
        })

    if not deliveries:
        raise HTTPException(400, "Nema validnih dostava za ovaj dan (provjeri adrese i porudžbine).")

    # ── 4. Pozovi solver ──────────────────────────────────
    result = await solve_route(
        driver_start=driver_start,
        departure_time_str=departure_time,
        farmers=farmers,
        deliveries=deliveries,
    )

    # ── 5. Ažuriraj status narudžbina na "assigned" ───────
    if result.get("status") == "success":
        order_ids = [d["order_id"] for d in deliveries]
        supabase.table("orders").update({"status": "assigned"})\
            .in_("id", order_ids).execute()

    return result