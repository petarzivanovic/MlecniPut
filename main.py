import os
import json
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# MODELI
# ─────────────────────────────────────────────

class RouteRequest(BaseModel):
    driver_id: str
    selected_date: str
    supplies: List[Dict[str, Any]]   # mlekari  → {name, address, liters}
    orders:   List[Dict[str, Any]]   # kupci    → {name, address, liters}

class PredictionRequest(BaseModel):
    subscriptions: List[Dict[str, Any]]
    orders: List[Dict[str, Any]]


# ─────────────────────────────────────────────
# NORMALIZACIJA PODATAKA SA FRONTENDA
# ─────────────────────────────────────────────

def normalize_supply(s: Dict[str, Any]) -> Dict[str, Any]:
    """
    Frontend šalje: {id, name, address, capacity_liters_per_day, ...}
    Backend očekuje: {name, address, liters}
    """
    liters = (
        s.get("liters")                    # ako već postoji
        or s.get("capacity_liters_per_day") # polje iz partner_applications
        or s.get("capacity")               # alternativno ime
        or 0
    )
    return {
        "id":      s.get("id", ""),
        "name":    s.get("name") or s.get("full_name") or "Nepoznat mlekar",
        "address": s.get("address") or "",
        "liters":  float(liters),
    }


def normalize_order(o: Dict[str, Any]) -> Dict[str, Any]:
    """
    Frontend šalje dve vrste:
      subscription: {id, user_id, plan_type, weekly_liters, delivery_days, delivery_address, customer_name, type}
      single_order: {id, user_id, delivery_date, items, delivery_address, customer_name, type}
    Backend očekuje: {name, address, liters}
    """
    order_type = o.get("type", "")

    # ── Ime kupca ──────────────────────────────
    name = (
        o.get("name")
        or o.get("customer_name")
        or "Nepoznat kupac"
    )

    # ── Adresa kupca ───────────────────────────
    address = (
        o.get("address")
        or o.get("delivery_address")
        or ""
    )

    # ── Litraža ────────────────────────────────
    if order_type == "subscription":
        weekly = float(o.get("weekly_liters") or o.get("liters") or 0)
        delivery_days = o.get("delivery_days") or []
        num_days = max(len(delivery_days), 1)   # koliko dana nedeljno se dostavlja
        liters = weekly / num_days              # dnevna količina
    elif order_type == "single_order":
        # items može biti lista {product, quantity_liters} ili broj
        items = o.get("items") or o.get("liters") or 0
        if isinstance(items, list):
            liters = sum(
                float(item.get("quantity_liters") or item.get("liters") or item.get("quantity") or 0)
                for item in items
            )
        else:
            liters = float(items)
    else:
        liters = float(o.get("liters") or o.get("weekly_liters") or 0)

    return {
        "id":      o.get("id", ""),
        "name":    name,
        "address": address,
        "liters":  round(liters, 1),
        "type":    order_type,
    }


# ─────────────────────────────────────────────
# GOOGLE HELPERS
# ─────────────────────────────────────────────

def geocode_address(address: str) -> Optional[Dict]:
    """Pretvara adresu u {lat, lng}. Vraća None ako ne uspe."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address + ", Srbija", "key": GOOGLE_API_KEY}
    try:
        r = requests.get(url, params=params, timeout=5)
        data = r.json()
        if data["status"] == "OK":
            loc = data["results"][0]["geometry"]["location"]
            return {"lat": loc["lat"], "lng": loc["lng"]}
    except Exception as e:
        print(f"Geocoding greška za '{address}': {e}")
    return None


def get_distance_matrix(origins: List[Dict], destinations: List[Dict]) -> Optional[List[List[int]]]:
    """
    Vraća matricu putnih vremena u SEKUNDAMA između svih parova.
    travel_times[i][j] = sekunde od origins[i] do destinations[j]
    """
    def latlon(c):
        return f"{c['lat']},{c['lng']}"

    origins_str      = "|".join(latlon(c) for c in origins)
    destinations_str = "|".join(latlon(c) for c in destinations)

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins":      origins_str,
        "destinations": destinations_str,
        "mode":         "driving",
        "key":          GOOGLE_API_KEY,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
        if data["status"] != "OK":
            print(f"Distance Matrix greška: {data['status']}")
            return None

        matrix = []
        for row in data["rows"]:
            matrix.append([
                el["duration"]["value"] if el["status"] == "OK" else 99999
                for el in row["elements"]
            ])
        return matrix
    except Exception as e:
        print(f"Distance Matrix exception: {e}")
        return None


# ─────────────────────────────────────────────
# OPTIMIZACIJA REDOSLEDA (nearest-neighbor TSP)
# ─────────────────────────────────────────────

def nearest_neighbor_order(coords: List[Dict], travel_matrix: List[List[int]]) -> List[int]:
    """
    Vraća redosled indeksa lista coords koji minimizuje ukupno putno vreme.
    Polazna tačka je uvek indeks 0 (prva u listi).
    """
    n = len(coords)
    if n == 0:
        return []
    if n == 1:
        return [0]

    visited = [False] * n
    order = [0]
    visited[0] = True

    for _ in range(n - 1):
        last = order[-1]
        best_time = float("inf")
        best_idx  = -1
        for j in range(n):
            if not visited[j] and travel_matrix[last][j] < best_time:
                best_time = travel_matrix[last][j]
                best_idx  = j
        if best_idx == -1:
            # svi ostali su nedostupni, uzimamo prvog neposećenog
            best_idx = next(i for i in range(n) if not visited[i])
        visited[best_idx] = True
        order.append(best_idx)

    return order


# ─────────────────────────────────────────────
# SPAJANJE NARUDŽBINA ISTE OSOBE (ista adresa → jedan stop)
# ─────────────────────────────────────────────

def merge_orders_by_address(orders: list) -> list:
    """
    Ako isti kupac ima više narudžbina za isti dan (subscription + single_order,
    ili više single_order-a), spajamo ih u jedan stop sa zbirnom litražom.
    Grupišemo po (address.strip().lower()) — isti ključ = isti stop.
    """
    merged: dict = {}
    for o in orders:
        addr_key = (o.get("address") or "").strip().lower()
        if not addr_key:
            continue  # bez adrese se ne može ni geocodirati

        if addr_key not in merged:
            merged[addr_key] = dict(o)  # kopija prvog
        else:
            # Dodajemo litre na postojeći stop
            merged[addr_key]["liters"] = round(
                float(merged[addr_key].get("liters", 0)) + float(o.get("liters", 0)), 1
            )
            # Ako drugi zapis ima ime a prvi ne, koristimo koje god postoji
            if not merged[addr_key].get("name"):
                merged[addr_key]["name"] = o.get("name")

    result = list(merged.values())
    print(f"Merge: {len(orders)} narudžbina → {len(result)} jedinstvenih stanica")
    return result


# ─────────────────────────────────────────────
# BALANS LITARA (Python matematika, ne AI)
# ─────────────────────────────────────────────

def balance_liters(supplies: List[Dict], orders: List[Dict]) -> tuple[List[Dict], List[Dict], str]:
    """
    Garantuje da suma pickup litara == suma delivery litara.
    Ako ima viška ponude, smanjuje poslednjeg mlekara.
    Ako ima viška potražnje, smanjuje poslednju narudžbinu.
    Vraća (usklađene supplies, usklađene orders, poruku o korekciji).
    """
    total_supply = sum(float(s.get("liters", 0)) for s in supplies)
    total_demand = sum(float(o.get("liters", 0)) for o in orders)

    note = ""

    if abs(total_supply - total_demand) < 0.01:
        return supplies, orders, "Ponuda i potražnja su izbalansirane."

    if total_supply > total_demand:
        # Višak ponude — smanjujemo poslednjeg mlekara
        diff = total_supply - total_demand
        supplies = [dict(s) for s in supplies]
        supplies[-1]["liters"] = max(0, float(supplies[-1]["liters"]) - diff)
        note = (f"Ponuda ({total_supply:.1f}L) > Potražnja ({total_demand:.1f}L). "
                f"Preuzimamo {total_demand:.1f}L ukupno — {diff:.1f}L manje od mlekara '{supplies[-1]['name']}'.")
    else:
        # Višak potražnje — smanjujemo poslednju narudžbinu
        diff = total_demand - total_supply
        orders = [dict(o) for o in orders]
        orders[-1]["liters"] = max(0, float(orders[-1]["liters"]) - diff)
        note = (f"Potražnja ({total_demand:.1f}L) > Ponuda ({total_supply:.1f}L). "
                f"Isporučujemo {total_supply:.1f}L ukupno — {diff:.1f}L manje kupcu '{orders[-1]['name']}'.")

    return supplies, orders, note


# ─────────────────────────────────────────────
# GRADNJA FINALNE RUTE SA VREMENIMA
# ─────────────────────────────────────────────

def build_stops_with_times(
    pickups: List[Dict],
    deliveries: List[Dict],
    pickup_coords: List[Dict],
    delivery_coords: List[Dict],
    pickup_order: List[int],
    delivery_order: List[int],
    pickup_to_delivery_times: List[List[int]],  # [pickup_i][delivery_j] u sekundama
    start_hour: int = 7,
    start_minute: int = 0,
    service_minutes: int = 15,  # minuta po stanici (utovar/istovar)
) -> List[Dict]:
    """
    Gradi listu stanica sa realnim vremenima.
    Redosled: svi pickup-ovi → svi delivery-ji.
    Vreme prelaska između stanica dolazi iz Google Distance Matrix.
    """
    stops = []
    current_seconds = start_hour * 3600 + start_minute * 60

    def fmt_time(seconds: int) -> str:
        h = (seconds // 3600) % 24
        m = (seconds % 3600) // 60
        return f"{h:02d}:{m:02d}"

    # --- PICKUP FAZA ---
    # Matrica pickup→pickup za redosled
    all_pickup_coords  = [pickup_coords[i]  for i in pickup_order]

    for step, idx in enumerate(pickup_order):
        stop = dict(pickups[idx])
        stop["type"] = "pickup"
        stop["time"] = fmt_time(current_seconds)
        stop["liters"] = float(stop.get("liters", 0))
        stops.append(stop)

        # Vreme do sledeće tačke
        if step < len(pickup_order) - 1:
            next_idx = pickup_order[step + 1]
            # koristimo pickup→pickup matricu ako je dostupna
            travel = 1800  # fallback 30min
            current_seconds += travel + service_minutes * 60
        else:
            current_seconds += service_minutes * 60  # servis na poslednjoj pickup stanici

    # --- DELIVERY FAZA ---
    all_delivery_coords = [delivery_coords[j] for j in delivery_order]

    for step, idx in enumerate(delivery_order):
        stop = dict(deliveries[idx])
        stop["type"] = "delivery"
        stop["time"] = fmt_time(current_seconds)
        stop["liters"] = float(stop.get("liters", 0))
        stops.append(stop)

        if step < len(delivery_order) - 1:
            travel = 1800  # fallback 30min
            current_seconds += travel + service_minutes * 60
        else:
            current_seconds += service_minutes * 60

    return stops


# ─────────────────────────────────────────────
# GLAVNI ENDPOINT
# ─────────────────────────────────────────────

@app.post("/api/generate-route")
async def generate_route(payload: RouteRequest):
    print(f"--- AI RAČUNA RUTU ZA VOZAČA: {payload.driver_id} | Datum: {payload.selected_date} ---")

    if not payload.supplies:
        return {"status": "error", "message": "Nema dostupnih mlekara za ovaj dan."}
    if not payload.orders:
        return {"status": "error", "message": "Nema narudžbina za ovaj dan."}

    # ── KORAK 0: Normalizacija polja sa frontenda ─────────────────────────
    # Frontend šalje drugačija imena polja — ovde mapiramo na ono što backend očekuje
    raw_supplies = [normalize_supply(s) for s in payload.supplies]
    raw_orders   = [normalize_order(o)  for o in payload.orders]

    print(f"Normalizovani supplies: {json.dumps(raw_supplies, ensure_ascii=False)}")
    print(f"Normalizovani orders:   {json.dumps(raw_orders,   ensure_ascii=False)}")

    # Filtriramo stavke bez adrese
    supplies_clean = [s for s in raw_supplies if s.get("address", "").strip()]
    orders_clean   = [o for o in raw_orders   if o.get("address", "").strip()]

    missing_addr_orders = [o["name"] for o in raw_orders if not o.get("address", "").strip()]
    if missing_addr_orders:
        print(f"Kupci bez adrese (preskoceni): {missing_addr_orders}")

    if not supplies_clean:
        return {"status": "error", "message": "Mlekari nemaju unesene adrese u sistemu."}
    if not orders_clean:
        return {"status": "error", "message": f"Kupci nemaju unesene adrese. Preskoceni: {missing_addr_orders}"}

    # ── KORAK 1: Spajamo narudžbine iste osobe pa balansiramo litre ─────────
    orders_merged = merge_orders_by_address(orders_clean)
    if not orders_merged:
        return {"status": "error", "message": "Nema validnih narudžbina sa adresama."}

    supplies, orders, balance_note = balance_liters(supplies_clean, orders_merged)
    print(f"Balans: {balance_note}")

    # ── KORAK 2: Geocodiranje svih adresa ─────────────────────────────────
    print("Geocodiram adrese...")
    pickup_coords   = [geocode_address(s.get("address", "")) for s in supplies]
    delivery_coords = [geocode_address(o.get("address", "")) for o in orders]

    # Fallback ako geocoding ne uspe za neku adresu
    pickup_coords   = [c if c else {"lat": 44.8, "lng": 20.5} for c in pickup_coords]
    delivery_coords = [c if c else {"lat": 44.8, "lng": 20.5} for c in delivery_coords]

    # ── KORAK 3: Distance Matrix ───────────────────────────────────────────
    print("Računam Distance Matrix...")

    all_coords = pickup_coords + delivery_coords

    # Matrica svih→svih (za optimizaciju redosleda)
    full_matrix = get_distance_matrix(all_coords, all_coords)

    # Ako API ne uspe, idemo sa fiksnim fallback redosledom
    if full_matrix:
        n_pickup = len(pickup_coords)
        n_delivery = len(delivery_coords)

        # Pickup matrica (samo pickup→pickup deo)
        pickup_matrix = [
            [full_matrix[i][j] for j in range(n_pickup)]
            for i in range(n_pickup)
        ]

        # Delivery matrica (samo delivery→delivery deo)
        delivery_matrix = [
            [full_matrix[n_pickup + i][n_pickup + j] for j in range(n_delivery)]
            for i in range(n_delivery)
        ]

        # Pickup→Delivery matrica (za tranziciju)
        pickup_to_delivery = [
            [full_matrix[i][n_pickup + j] for j in range(n_delivery)]
            for i in range(n_pickup)
        ]

        # Optimizacija redosleda
        pickup_order   = nearest_neighbor_order(pickup_coords, pickup_matrix)
        delivery_order = nearest_neighbor_order(delivery_coords, delivery_matrix)

        # Realno vreme tranzita između stanica (u minutima, za AI prompt)
        def secs_to_min(s):
            return round(s / 60)

        transit_pickup = [
            secs_to_min(pickup_matrix[pickup_order[i]][pickup_order[i+1]])
            for i in range(len(pickup_order) - 1)
        ]
        last_pickup_to_first_delivery = secs_to_min(
            pickup_to_delivery[pickup_order[-1]][delivery_order[0]]
        ) if pickup_order and delivery_order else 30

        transit_delivery = [
            secs_to_min(delivery_matrix[delivery_order[i]][delivery_order[i+1]])
            for i in range(len(delivery_order) - 1)
        ]
    else:
        # Fallback: prirodan redosled, procenjeno vreme
        pickup_order   = list(range(len(supplies)))
        delivery_order = list(range(len(orders)))
        transit_pickup = [20] * max(0, len(supplies) - 1)
        transit_delivery = [20] * max(0, len(orders) - 1)
        last_pickup_to_first_delivery = 30
        pickup_to_delivery = []

    # ── KORAK 4: Gradimo strukturu rute sa tačnim vremenima ───────────────
    print("Gradim raspored vremena...")

    START_HOUR = 7
    SERVICE_MIN = 5   # minuta za utovar/istovar po stanici (dostava mleka je brza)
    current_sec = START_HOUR * 3600

    def fmt(sec):
        h = (sec // 3600) % 24
        m = (sec % 3600) // 60
        return f"{h:02d}:{m:02d}"

    stops = []

    # Pickup stanice
    for step, idx in enumerate(pickup_order):
        s = supplies[idx]
        stops.append({
            "type":    "pickup",
            "name":    s.get("name", f"Mlekar {idx+1}"),
            "address": s.get("address", ""),
            "liters":  round(float(s.get("liters", 0)), 1),
            "time":    fmt(current_sec),
        })
        current_sec += SERVICE_MIN * 60
        if step < len(pickup_order) - 1:
            travel_min = transit_pickup[step] if step < len(transit_pickup) else 20
            current_sec += travel_min * 60  # realno vreme od Google Distance Matrix

    # Tranzit od poslednjeg mlekara do prvog kupca
    current_sec += last_pickup_to_first_delivery * 60

    # Delivery stanice
    for step, idx in enumerate(delivery_order):
        o = orders[idx]
        stops.append({
            "type":    "delivery",
            "name":    o.get("name", f"Kupac {idx+1}"),
            "address": o.get("address", ""),
            "liters":  round(float(o.get("liters", 0)), 1),
            "time":    fmt(current_sec),
        })
        current_sec += SERVICE_MIN * 60
        if step < len(delivery_order) - 1:
            travel_min = transit_delivery[step] if step < len(transit_delivery) else 20
            current_sec += travel_min * 60

    # ── KORAK 5: AI samo pravi kratak komentar o ruti (ne menja brojeve!) ─
    route_summary = json.dumps(stops, ensure_ascii=False)

    system_prompt = """
    Ti si AI asistent za kompaniju 'Mlečni put'. 
    Ruta i sva vremena su već izračunati — NE menjaj ih.
    Napiši kratak, prijatan komentar vozaču na srpskom (3-4 rečenice):
    - Koliko stopa ima
    - Ukupno litara za prevoz
    - Procenu završetka radnog dana
    - Eventualne napomene (npr. ako je došlo do korekcije litara)
    Budi konkretan i human.
    """

    user_prompt = (
        f"Ruta:\n{route_summary}\n\n"
        f"Napomena o balansu: {balance_note}"
    )

    try:
        ai_resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            max_tokens=300,
        )
        comment = ai_resp.choices[0].message.content.strip()
    except Exception as e:
        comment = f"Ruta uspešno generisana. ({e})"

    # ── KORAK 6: Vraćamo rezultat ─────────────────────────────────────────
    total_liters = sum(s["liters"] for s in stops if s["type"] == "pickup")

    return {
        "status":        "success",
        "route":         stops,
        "total_liters":  round(total_liters, 1),
        "balance_note":  balance_note,
        "ai_comment":    comment,
        "stops_count":   len(stops),
    }


# ─────────────────────────────────────────────
# PREDIKCIJA POTRAŽNJE (nepromenjena logika)
# ─────────────────────────────────────────────

@app.post("/api/predict-demand")
async def predict_demand(payload: PredictionRequest):
    print("--- AI PRAVI PREDIKCIJU POTRAŽNJE ---")

    subs_str  = json.dumps(payload.subscriptions, ensure_ascii=False)
    orders_str = json.dumps(payload.orders, ensure_ascii=False)

    system_prompt = """
    Ti si AI analitičar za srpsku kompaniju 'Mlečni put'.
    Na osnovu aktivnih pretplata predvidi potražnju za sledeću nedelju.

    Tvoj odgovor MORA biti isključivo JSON:
    {
        "weekly_forecast": [
            {"day": "Ponedeljak", "liters": broj, "trend": "visok/srednji/nizak"}
        ],
        "peak_day": "dan sa najviše potražnje sledeće nedelje",
        "peak_liters": broj,
        "change_percent": broj,
        "farmer_message": "Poruka mlekaru na srpskom koliko da pripremi i kog dana",
        "customer_prediction": "Kratka rečenica upozorenja na srpskom"
    }
    """

    user_prompt = f"Aktivne pretplate: {subs_str}\nJednokratne narudžbine: {orders_str}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ]
        )
        result = json.loads(response.choices[0].message.content)
        return {"status": "success", "prediction": result}

    except Exception as e:
        print(f"Greška: {e}")
        return {"status": "error", "message": str(e)}