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
ORS_API_KEY = os.getenv("ORS_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
# MODELI
# ═══════════════════════════════════════════════════════════════

class RouteRequest(BaseModel):
    driver_id: str
    selected_date: str
    supplies: List[Dict[str, Any]]
    orders: List[Dict[str, Any]]

class PredictionRequest(BaseModel):
    subscriptions: List[Dict[str, Any]]
    orders: List[Dict[str, Any]]


# ═══════════════════════════════════════════════════════════════
# KORAK 1 — NORMALIZACIJA
# ═══════════════════════════════════════════════════════════════

def normalize_supply(s: Dict) -> Optional[Dict]:
    liters = float(
        s.get("liters") or
        s.get("capacity_liters_per_day") or
        s.get("capacity") or 0
    )
    address = (s.get("address") or "").strip()
    name    = s.get("name") or s.get("full_name") or "Nepoznat mlekar"
    if not address or liters <= 0:
        print(f"  Supply preskocen — '{name}': adresa={address!r}, liters={liters}")
        return None
    return {"name": name, "address": address, "liters": liters}


def normalize_order(o: Dict) -> Optional[Dict]:
    name    = o.get("customer_name") or o.get("name") or "Nepoznat kupac"
    address = (o.get("delivery_address") or o.get("address") or "").strip()
    if not address:
        print(f"  Order preskocen — '{name}': nema adrese")
        return None

    order_type = o.get("type", "")
    if order_type == "subscription":
        weekly   = float(o.get("weekly_liters") or o.get("liters") or 0)
        days     = o.get("delivery_days") or []
        liters   = round(weekly / max(len(days), 1), 1)
    elif order_type == "single_order":
        items = o.get("items") or o.get("liters") or 0
        if isinstance(items, list):
            liters = round(sum(
                float(i.get("quantity_liters") or i.get("liters") or i.get("quantity") or 0)
                for i in items
            ), 1)
        else:
            liters = round(float(items), 1)
    else:
        liters = round(float(o.get("liters") or o.get("weekly_liters") or 0), 1)

    if liters <= 0:
        print(f"  Order preskocen — '{name}': liters=0")
        return None

    return {"name": name, "address": address, "liters": liters}


def merge_by_address(orders: List[Dict]) -> List[Dict]:
    merged: Dict[str, Dict] = {}
    for o in orders:
        key = o["address"].strip().lower()
        if key in merged:
            merged[key]["liters"] = round(merged[key]["liters"] + o["liters"], 1)
        else:
            merged[key] = dict(o)
    result = list(merged.values())
    print(f"Merge: {len(orders)} narudzibna -> {len(result)} jedinstvenih stanica")
    return result


# ═══════════════════════════════════════════════════════════════
# KORAK 2 — GEOCODING (Nominatim / OpenStreetMap)
# ═══════════════════════════════════════════════════════════════

_geocache: Dict[str, Optional[Dict]] = {}

# Slojevi koje smatramo dovoljno preciznim (ulica ili tacka)
GOOD_LAYERS = {"address", "street", "venue", "intersection"}
# Slojevi koje prihvatamo samo ako nemamo bolji rezultat
WEAK_LAYERS = {"neighbourhood", "locality", "localadmin", "county", "region", "country"}

CITY_MAP = {
    "beograd": "Belgrade", "novi sad": "Novi Sad",
    "nis": "Nis", "kragujevac": "Kragujevac",
    "subotica": "Subotica", "zemun": "Belgrade",
}

# Mapa latinicnih slova na srpska dijakritička (za korisnike koji kucaju bez š,č,ć,đ,ž)
LATIN_TO_SRB = str.maketrans({
    "c": "č", "s": "š", "z": "ž",
    "C": "Č", "S": "Š", "Z": "Ž",
})
# I obrnuto — sa dijakritika na latinicu (za ORS koji ponekad bolje radi bez)
SRB_TO_LATIN = str.maketrans({
    "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "dj",
    "Č": "C", "Ć": "C", "Š": "S", "Ž": "Z", "Đ": "Dj",
})

def expand_address_variants(address: str) -> list:
    """
    Za datu adresu pravi varijante sa i bez dijakritika.
    Primer: 'gramsijeva 4' → ['gramsijeva 4', 'gramšijeva 4', 'gramšijeva 4, Belgrade']
    Primer: 'Gramšijeva 4' → ['Gramšijeva 4', 'Gramsijeva 4']
    """
    variants = [address]
    # Varijanta sa dijakritikama (s→š, c→č, z→ž)
    with_diacritics = address.translate(LATIN_TO_SRB)
    if with_diacritics != address:
        variants.append(with_diacritics)
    # Varijanta bez dijakritika (š→s, č→c itd)
    without_diacritics = address.translate(SRB_TO_LATIN)
    if without_diacritics != address:
        variants.append(without_diacritics)
    return list(dict.fromkeys(variants))  # deduplikacija

def _build_attempts(address: str) -> list:
    """
    Pravi listu varijanti adrese za probanje, od najpreciznijeg ka najmanje preciznom.
    Ukljucuje varijante sa i bez dijakritika (š/s, č/c, ž/z, ć/c, đ/dj).
    """
    parts = [p.strip() for p in address.split(",")]
    # Uklanjamo postanski broj
    parts_nz = [p for p in parts if not (p.strip().isdigit() and len(p.strip()) == 5)]
    # Mapiramo grad na engleski
    parts_en = []
    for p in parts_nz:
        mapped = CITY_MAP.get(p.strip().lower())
        parts_en.append(mapped if mapped else p.strip().title())

    full_en   = ", ".join(parts_en)
    full_orig = ", ".join(parts_nz)
    only_street_en = ", ".join(parts_en[:2]) if len(parts_en) >= 2 else full_en

    base_attempts = [full_en, full_orig, only_street_en]

    # Za svaku bazu dodajemo varijante sa/bez dijakritika
    all_attempts = []
    for base in base_attempts:
        all_attempts.extend(expand_address_variants(base))

    return list(dict.fromkeys(all_attempts))  # deduplikacija, zadrzavamo redosled


def _ors_geocode_attempt(query: str) -> Optional[tuple]:
    """
    Poziva ORS geocoding za jedan query.
    Vraca (lat, lng, layer, confidence, label) ili None.
    """
    try:
        r = requests.get(
            "https://api.openrouteservice.org/geocode/search",
            headers={"Authorization": ORS_API_KEY},
            params={"text": query, "boundary.country": "RS", "size": 3},
            timeout=6,
        )
        data = r.json()
        if "error" in data:
            print(f"  ORS auth greska: {data['error']}")
            return None
        features = data.get("features", [])
        if not features:
            return None

        # Biramo prvi rezultat koji je u dobrom sloju
        for f in features:
            props = f.get("properties", {})
            layer = props.get("layer", "")
            conf  = props.get("confidence", 0)
            label = props.get("label", query)[:70]
            lng, lat = f["geometry"]["coordinates"]
            if layer in GOOD_LAYERS:
                return (lat, lng, layer, conf, label)

        # Ako nema dobrog, uzimamo prvi bez obzira na sloj
        f     = features[0]
        props = f.get("properties", {})
        lng, lat = f["geometry"]["coordinates"]
        return (lat, lng, props.get("layer","?"), props.get("confidence",0), props.get("label",query)[:70])

    except Exception as e:
        print(f"  ORS greska za '{query}': {e}")
        return None


def geocode(address: str) -> Optional[Dict]:
    """
    Geocoding koristeci ORS API (radi na Render-u).
    Proba vise varijanti adrese i bira najprecizaniji rezultat (po layer-u).
    """
    key = address.strip().lower()
    if key in _geocache:
        return _geocache[key]

    attempts = _build_attempts(address)
    best_result = None  # (lat, lng, layer, conf, label)

    for attempt in attempts:
        res = _ors_geocode_attempt(attempt)
        if res is None:
            continue
        lat, lng, layer, conf, label = res
        print(f"  ORS '{attempt}' -> '{label}' ({lat:.5f},{lng:.5f}) [{layer} conf={conf}]")

        if layer in GOOD_LAYERS:
            # Nasli smo tacnu adresu, ne trebamo dalje traziti
            result = {"lat": lat, "lng": lng}
            _geocache[key] = result
            print(f"  Geocoded '{address}' -> TACNO [{layer}]")
            return result
        elif best_result is None:
            # Cuvamo kao fallback ali nastavljamo da trazimo bolji
            best_result = res

    if best_result:
        lat, lng, layer, conf, label = best_result
        result = {"lat": lat, "lng": lng}
        _geocache[key] = result
        print(f"  Geocoded '{address}' -> PRIBLIZNO [{layer}] upozorenje: nije tacna adresa")
        return result

    print(f"  Geocoding NEUSPESNO za '{address}' -> koristimo fallback")
    _geocache[key] = None
    return None


# ═══════════════════════════════════════════════════════════════
# KORAK 3 — DISTANCE MATRIX (ORS)
# ═══════════════════════════════════════════════════════════════

def get_travel_matrix(coords: List[Dict]) -> Optional[List[List[int]]]:
    if len(coords) < 2:
        return [[0]]
    locations = [[c["lng"], c["lat"]] for c in coords]
    try:
        r = requests.post(
            "https://api.openrouteservice.org/v2/matrix/driving-car",
            headers={"Authorization": ORS_API_KEY, "Content-Type": "application/json"},
            json={"locations": locations, "metrics": ["duration"]},
            timeout=15,
        )
        data = r.json()
        if "durations" not in data:
            print(f"  ORS Matrix greska: {data}")
            return None
        matrix = [
            [int(v) if v is not None else 99999 for v in row]
            for row in data["durations"]
        ]
        print(f"  ORS Matrix OK: {len(matrix)}x{len(matrix)} matrica")
        return matrix
    except Exception as e:
        print(f"  ORS Matrix exception: {e}")
        return None


def fallback_matrix(n: int) -> List[List[int]]:
    return [[0 if i == j else 1200 for j in range(n)] for i in range(n)]


# ═══════════════════════════════════════════════════════════════
# KORAK 4 — SELEKCIJA MLEKARA
# ═══════════════════════════════════════════════════════════════

def select_suppliers(
    suppliers: List[Dict],
    sup_coords: List[Dict],
    del_coords: List[Dict],
    total_demand: float,
    sup_to_del: List[List[int]],
) -> tuple:
    def avg_score(i: int) -> float:
        if i >= len(sup_to_del):
            return float("inf")
        row = [t for t in sup_to_del[i] if t < 99998]
        return sum(row) / len(row) if row else float("inf")

    indexed = sorted(range(len(suppliers)), key=avg_score)
    sel_s, sel_c = [], []
    collected = 0.0

    for i in indexed:
        if collected >= total_demand:
            break
        s     = suppliers[i]
        take  = min(float(s["liters"]), total_demand - collected)
        sc    = dict(s)
        sc["liters"] = round(take, 1)
        sel_s.append(sc)
        sel_c.append(sup_coords[i])
        collected += take
        print(f"  Mlekar '{s['name']}': uzimamo {take:.1f}L (score={avg_score(i):.0f}s)")

    print(f"  Selekcija: {len(sel_s)} mlekara, {collected:.1f}L / {total_demand:.1f}L")
    return sel_s, sel_c


# ═══════════════════════════════════════════════════════════════
# KORAK 5 — OPTIMALNA RUTA
# nearest-neighbor: mlekari → od poslednjeg mlekara najbliži kupac → sledeći...
# ═══════════════════════════════════════════════════════════════

def build_route(
    suppliers: List[Dict],
    sup_coords: List[Dict],
    deliveries: List[Dict],
    del_coords: List[Dict],
    matrix: List[List[int]],
    start_sec: int = 7 * 3600,
    service_sec: int = 10 * 60,
) -> List[Dict]:
    n_sup = len(suppliers)
    n_del = len(deliveries)

    def travel_sec(i: int, j: int) -> int:
        if 0 <= i < len(matrix) and 0 <= j < len(matrix):
            v = matrix[i][j]
            return v if v < 99998 else 1200
        return 1200

    def fmt(sec: int) -> str:
        return f"{(sec // 3600) % 24:02d}:{(sec % 3600) // 60:02d}"

    stops = []
    current_sec = start_sec

    # ── Mlekari: nearest-neighbor počevši od indeksa 0 ────────────
    sup_visited = [False] * n_sup
    sup_order   = [0]
    sup_visited[0] = True

    for _ in range(n_sup - 1):
        cur = sup_order[-1]
        best_t, best_j = float("inf"), -1
        for j in range(n_sup):
            if not sup_visited[j] and matrix[cur][j] < best_t:
                best_t = matrix[cur][j]
                best_j = j
        if best_j == -1:
            best_j = next(j for j in range(n_sup) if not sup_visited[j])
        sup_visited[best_j] = True
        sup_order.append(best_j)

    for step, si in enumerate(sup_order):
        stops.append({
            "type":    "pickup",
            "name":    suppliers[si]["name"],
            "address": suppliers[si]["address"],
            "liters":  suppliers[si]["liters"],
            "time":    fmt(current_sec),
        })
        current_sec += service_sec
        if step < len(sup_order) - 1:
            nxt = sup_order[step + 1]
            current_sec += travel_sec(si, nxt)

    # ── Kupci: od poslednjeg mlekara, nearest-neighbor ────────────
    last_sup = sup_order[-1]  # globalni indeks poslednjeg mlekara u matrici
    del_visited = [False] * n_del
    del_order   = []

    # Prvog kupca biramo kao najbližeg poslednjem mlekaru
    best_t, first_del = float("inf"), 0
    for j in range(n_del):
        t = travel_sec(last_sup, n_sup + j)
        if t < best_t:
            best_t, first_del = t, j

    del_visited[first_del] = True
    del_order.append(first_del)
    current_sec += travel_sec(last_sup, n_sup + first_del)

    # Ostale kupce biramo nearest-neighbor
    for _ in range(n_del - 1):
        cur_global = n_sup + del_order[-1]
        best_t, best_j = float("inf"), -1
        for j in range(n_del):
            if not del_visited[j]:
                t = travel_sec(cur_global, n_sup + j)
                if t < best_t:
                    best_t, best_j = t, j
        if best_j == -1:
            best_j = next(j for j in range(n_del) if not del_visited[j])
        del_visited[best_j] = True
        del_order.append(best_j)

    for step, di in enumerate(del_order):
        stops.append({
            "type":    "delivery",
            "name":    deliveries[di]["name"],
            "address": deliveries[di]["address"],
            "liters":  deliveries[di]["liters"],
            "time":    fmt(current_sec),
        })
        current_sec += service_sec
        if step < len(del_order) - 1:
            nxt_global = n_sup + del_order[step + 1]
            current_sec += travel_sec(n_sup + di, nxt_global)

    return stops


# ═══════════════════════════════════════════════════════════════
# GLAVNI ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.post("/api/generate-route")
async def generate_route(payload: RouteRequest):
    print(f"\n{'='*60}")
    print(f"RUTA: vozac={payload.driver_id} | datum={payload.selected_date}")
    print(f"{'='*60}")

    # 1. Normalizacija
    print("\n[1] Normalizacija...")
    suppliers = [s for s in (normalize_supply(x) for x in payload.supplies) if s]
    orders_raw = [o for o in (normalize_order(x) for x in payload.orders) if o]

    if not suppliers:
        return {"status": "error", "message": "Nema mlekara sa validnom adresom i litrazom."}
    if not orders_raw:
        return {"status": "error", "message": "Nema narudzibna sa validnom adresom."}

    # 2. Merge narudzbina
    print("\n[2] Merge narudzibna...")
    deliveries   = merge_by_address(orders_raw)
    total_demand = round(sum(d["liters"] for d in deliveries), 1)
    print(f"  Ukupna traznja: {total_demand}L od {len(deliveries)} kupaca")

    # 3. Geocoding
    print("\n[3] Geocoding...")
    FALLBACK = {"lat": 44.8125, "lng": 20.4612}
    sup_coords = [geocode(s["address"]) or FALLBACK for s in suppliers]
    del_coords = [geocode(d["address"]) or FALLBACK for d in deliveries]

    print("  Koordinate mlekara:")
    for s, c in zip(suppliers, sup_coords):
        print(f"    '{s['name']}' @ {c['lat']:.5f}, {c['lng']:.5f}")
    print("  Koordinate kupaca:")
    for d, c in zip(deliveries, del_coords):
        print(f"    '{d['name']}' @ {c['lat']:.5f}, {c['lng']:.5f}")

    # 4. Matrica mlekari→kupci za selekciju
    print("\n[4] Matrica mlekari->kupci...")
    sel_coords  = sup_coords + del_coords
    sel_matrix  = get_travel_matrix(sel_coords) or fallback_matrix(len(sel_coords))
    n_sup_all   = len(sup_coords)
    sup_to_del  = [
        [sel_matrix[i][n_sup_all + j] for j in range(len(del_coords))]
        for i in range(n_sup_all)
    ]

    # 5. Selekcija mlekara
    print("\n[5] Selekcija mlekara...")
    sel_suppliers, sel_sup_coords = select_suppliers(
        suppliers, sup_coords, del_coords, total_demand, sup_to_del
    )
    if not sel_suppliers:
        return {"status": "error", "message": "Nema dostupnog mleka za ovaj dan."}

    # Balans: ako je skupljeno vise nego sto treba, smanjujemo poslednjeg mlekara
    collected = sum(s["liters"] for s in sel_suppliers)
    if collected > total_demand + 0.01:
        sel_suppliers[-1]["liters"] = round(sel_suppliers[-1]["liters"] - (collected - total_demand), 1)

    # 6. Finalna matrica (selektovani mlekari + kupci)
    print("\n[6] Finalna matrica za rutu...")
    final_coords  = sel_sup_coords + del_coords
    route_matrix  = get_travel_matrix(final_coords) or fallback_matrix(len(final_coords))

    # 7. Gradimo rutu
    print("\n[7] Gradim rutu...")
    stops = build_route(
        suppliers   = sel_suppliers,
        sup_coords  = sel_sup_coords,
        deliveries  = deliveries,
        del_coords  = del_coords,
        matrix      = route_matrix,
        start_sec   = 7 * 3600,
        service_sec = 10 * 60,
    )

    print(f"\n  Finalna ruta ({len(stops)} stanica):")
    for s in stops:
        print(f"    {s['time']} [{s['type']:8}] {s['name']} — {s['liters']}L")

    # 8. AI komentar
    try:
        ai_resp = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=200,
            messages=[
                {"role": "system", "content": (
                    "Ti si asistent za 'Mlecni put'. Napisi kratak komentar vozacu "
                    "na srpskom (2-3 recenice): koliko stanica, ukupno litara, "
                    "kada priblizno zavrsava. NE menjaj rutu."
                )},
                {"role": "user", "content": json.dumps(stops, ensure_ascii=False)},
            ]
        )
        comment = ai_resp.choices[0].message.content.strip()
    except Exception as e:
        comment = f"Ruta sa {len(stops)} stanica uspesno generisana."

    return {
        "status":       "success",
        "route":        stops,
        "total_liters": round(sum(s["liters"] for s in stops if s["type"] == "pickup"), 1),
        "ai_comment":   comment,
        "stops_count":  len(stops),
    }


# ═══════════════════════════════════════════════════════════════
# PREDIKCIJA POTRAZNJE
# ═══════════════════════════════════════════════════════════════

@app.post("/api/predict-demand")
async def predict_demand(payload: PredictionRequest):
    print("--- AI PRAVI PREDIKCIJU POTRAZNJE ---")
    system_prompt = """
    Ti si AI analiticar za srpsku kompaniju 'Mlecni put'.
    Na osnovu aktivnih pretplata predvidi potraznju za sledecu nedelju.
    Tvoj odgovor MORA biti iskljucivo JSON:
    {
        "weekly_forecast": [{"day": "Ponedeljak", "liters": broj, "trend": "visok/srednji/nizak"}],
        "peak_day": "dan sa najvise potraznje",
        "peak_liters": broj,
        "change_percent": broj,
        "farmer_message": "Poruka mlekaru na srpskom",
        "customer_prediction": "Kratka recenica upozorenja na srpskom"
    }
    """
    user_prompt = (
        f"Aktivne pretplate: {json.dumps(payload.subscriptions, ensure_ascii=False)}\n"
        f"Jednokratne narudzibne: {json.dumps(payload.orders, ensure_ascii=False)}"
    )
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
        print(f"Greska: {e}")
        return {"status": "error", "message": str(e)}