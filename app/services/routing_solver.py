import httpx
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from datetime import datetime, time, timedelta
from app.config import settings

# ── Konstante ──────────────────────────────────────────────
VEHICLE_CAPACITY_LITERS = 50
DEFAULT_WINDOW_START = time(7, 0)   # ako kupac nije izabrao prozor
DEFAULT_WINDOW_END   = time(22, 0)
DEFAULT_FARMER_OPEN  = time(5, 0)
DEFAULT_FARMER_CLOSE = time(10, 0)  # mleko mora biti preuzeto ujutru
SERVICE_TIME_MINUTES = 5            # vreme utovara/istovara po stanici

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


# ── Google Distance Matrix ─────────────────────────────────
async def get_duration_matrix(locations: list[dict]) -> list[list[int]]:
    """
    Vraća matricu vremena putovanja u SEKUNDAMA između svih lokacija.
    locations: [{"lat": float, "lng": float}, ...]
    Radi u batchevima jer Google API ima limit 10x10 po pozivu.
    """
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]

    coords_str = [f"{loc['lat']},{loc['lng']}" for loc in locations]

    async with httpx.AsyncClient(timeout=30) as client:
        for i in range(n):
            resp = await client.get(DISTANCE_MATRIX_URL, params={
                "origins": coords_str[i],
                "destinations": "|".join(coords_str),
                "key": settings.google_maps_api_key,
                "mode": "driving",
                "departure_time": "now",   # realan saobraćaj
                "language": "sr",
            })
            data = resp.json()

            if data["status"] != "OK":
                # Fallback: Euklidska distanca ako API ne radi
                matrix[i] = _euclidean_row(locations, i)
                continue

            row = data["rows"][0]["elements"]
            for j, elem in enumerate(row):
                if elem["status"] == "OK":
                    # duration_in_traffic ako postoji, inače duration
                    dur = elem.get("duration_in_traffic", elem.get("duration"))
                    matrix[i][j] = dur["value"]  # sekunde
                else:
                    matrix[i][j] = 99999

    return matrix


def _euclidean_row(locations: list[dict], origin_idx: int) -> list[int]:
    """Fallback: approx. vreme u sekundama na osnovu Euklidske udaljenosti."""
    import math
    origin = locations[origin_idx]
    row = []
    for loc in locations:
        dlat = (loc["lat"] - origin["lat"]) * 111000
        dlng = (loc["lng"] - origin["lng"]) * 79000  # ~Beograd
        dist_m = math.sqrt(dlat**2 + dlng**2)
        # Prosečna gradska brzina 30 km/h = 8.33 m/s
        row.append(int(dist_m / 8.33))
    return row


# ── Pomoćne funkcije za vreme ──────────────────────────────
def time_to_seconds(t: time, base_hour: int = 0) -> int:
    """Konvertuje time u sekunde od ponoći."""
    return t.hour * 3600 + t.minute * 60 + t.second


def parse_time_window(start_str: str | None, end_str: None | str,
                      default_start: time, default_end: time) -> tuple[int, int]:
    """Parsira HH:MM string u sekunde. Vraća default ako je None."""
    def parse(s, default):
        if not s:
            return time_to_seconds(default)
        try:
            parts = s.split(":")
            return int(parts[0]) * 3600 + int(parts[1]) * 60
        except Exception:
            return time_to_seconds(default)

    return parse(start_str, default_start), parse(end_str, default_end)


# ── Glavni Solver ──────────────────────────────────────────
async def solve_route(
    driver_start: dict,          # {"lat": float, "lng": float}
    departure_time_str: str,     # "07:00"
    farmers: list[dict],         # lista mlekara sa koordinatama i kapacitetom
    deliveries: list[dict],      # lista dostava sa koordinatama i prozorima
) -> dict:
    """
    Rešava VRPTW i vraća sekvencu stanica.

    farmers: [{
        "id": str,
        "lat": float, "lng": float,
        "name": str, "address": str,
        "capacity": float,
    }]

    deliveries: [{
        "order_id": str,
        "user_id": str,
        "lat": float, "lng": float,
        "address": str,
        "customer_name": str,
        "liters": float,
        "time_window_start": str | None,  # "09:00"
        "time_window_end": str | None,    # "12:00"
    }]
    """

    # ── 1. Izjednačavanje ponude i potražnje ───────────────
    total_demand = sum(d["liters"] for d in deliveries)

    if total_demand == 0:
        return {"status": "error", "message": "Nema porudžbina za ovaj dan."}

    if total_demand > VEHICLE_CAPACITY_LITERS:
        return {
            "status": "error",
            "message": f"Ukupna potražnja ({total_demand}L) prelazi kapacitet vozila ({VEHICLE_CAPACITY_LITERS}L)."
        }

    # Odaberi mlekare dok ne pokriješ potražnju (po kapacitetu, najbliže prvom)
    selected_farmers = _select_farmers(farmers, total_demand, driver_start)
    total_supply = sum(f["assigned_liters"] for f in selected_farmers)

    if total_supply < total_demand:
        return {
            "status": "error",
            "message": f"Nedovoljna ponuda mleka ({total_supply}L) za potražnju ({total_demand}L)."
        }

    # ── 2. Gradi listu svih lokacija ──────────────────────
    # Indeksi: 0 = depot (vozač start), 1..F = mlekare, F+1..end = dostave
    all_locations = [driver_start]
    for f in selected_farmers:
        all_locations.append({"lat": f["lat"], "lng": f["lng"]})
    delivery_start_idx = len(all_locations)
    for d in deliveries:
        all_locations.append({"lat": d["lat"], "lng": d["lng"]})

    depot_idx = 0
    n_locations = len(all_locations)

    # ── 3. Distance/Duration Matrix ───────────────────────
    duration_matrix = await get_duration_matrix(all_locations)

    # ── 4. Vremenski prozori (sekunde od ponoći) ──────────
    dep_h, dep_m = map(int, departure_time_str.split(":"))
    departure_sec = dep_h * 3600 + dep_m * 60

    time_windows = []

    # Depot: vozač polazi tačno u departure_time
    time_windows.append((departure_sec, departure_sec + 3600))

    # Mlekare: rano ujutru (preuzimanje svežeg mleka)
    for _ in selected_farmers:
        tw_s, tw_e = parse_time_window(None, None, DEFAULT_FARMER_OPEN, DEFAULT_FARMER_CLOSE)
        # Prozor ne sme biti pre polaska
        time_windows.append((max(tw_s, departure_sec), tw_e))

    # Kupci: njihov izabrani prozor
    for d in deliveries:
        tw_s, tw_e = parse_time_window(
            d.get("time_window_start"),
            d.get("time_window_end"),
            DEFAULT_WINDOW_START,
            DEFAULT_WINDOW_END,
        )
        time_windows.append((tw_s, tw_e))

    # ── 5. OR-Tools VRPTW Setup ───────────────────────────
    manager = pywrapcp.RoutingIndexManager(n_locations, 1, depot_idx)
    routing = pywrapcp.RoutingModel(manager)

    # Callback: vreme putovanja + service time
    service_sec = SERVICE_TIME_MINUTES * 60

    def time_callback(from_idx, to_idx):
        from_node = manager.IndexToNode(from_idx)
        to_node = manager.IndexToNode(to_idx)
        return duration_matrix[from_node][to_node] + service_sec

    transit_cb = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb)

    # Dimension za vreme (omogućava time windows)
    routing.AddDimension(
        transit_cb,
        slack_max=3600,        # čekanje do 1h je ok (mlekara se otvori ranije)
        capacity=86400,        # max 24h ruta
        fix_start_cumul_to_zero=False,
        name="Time"
    )
    time_dim = routing.GetDimensionOrDie("Time")

    # Postavi time windows
    for loc_idx, (tw_start, tw_end) in enumerate(time_windows):
        index = manager.NodeToIndex(loc_idx)
        time_dim.CumulVar(index).SetRange(tw_start, tw_end)

    # Kapacitet: vozilo nosi max 50L
    def demand_callback(from_idx):
        node = manager.IndexToNode(from_idx)
        if node == depot_idx:
            return 0
        if node < delivery_start_idx:
            # Mlekara: utovar (negativna potražnja = punjenje)
            farmer_local_idx = node - 1
            return -int(selected_farmers[farmer_local_idx]["assigned_liters"] * 1000)
        else:
            # Kupac: istovar
            delivery_local_idx = node - delivery_start_idx
            return int(deliveries[delivery_local_idx]["liters"] * 1000)

    demand_cb = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_cb,
        slack_max=0,
        vehicle_capacities=[VEHICLE_CAPACITY_LITERS * 1000],
        fix_start_cumul_to_zero=True,
        name="Capacity"
    )

    # Ograničenje: sve mlekare MORAJU biti posećene PRE dostava
    for farmer_node in range(1, delivery_start_idx):
        farmer_index = manager.NodeToIndex(farmer_node)
        for delivery_node in range(delivery_start_idx, n_locations):
            delivery_index = manager.NodeToIndex(delivery_node)
            routing.solver().Add(
                time_dim.CumulVar(farmer_index) <= time_dim.CumulVar(delivery_index)
            )

    # Parametri solvera
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = 10  # max 10s za solver

    solution = routing.SolveWithParameters(search_params)

    if not solution:
        return {"status": "error", "message": "AI nije pronašao validnu rutu. Provjeri podatke."}

    # ── 6. Izvuci rezultat ─────────────────────────────────
    return _extract_solution(
        solution, routing, manager,
        selected_farmers, deliveries,
        time_windows, departure_sec,
        driver_start, delivery_start_idx
    )


def _select_farmers(farmers: list[dict], total_demand: float, driver_start: dict) -> list[dict]:
    """Bira minimum mlekara potrebnih da pokriju potražnju, sortirano po blizini."""
    import math

    def dist(f):
        dlat = (f["lat"] - driver_start["lat"]) * 111000
        dlng = (f["lng"] - driver_start["lng"]) * 79000
        return math.sqrt(dlat**2 + dlng**2)

    sorted_farmers = sorted(farmers, key=dist)
    selected = []
    remaining = total_demand

    for f in sorted_farmers:
        if remaining <= 0:
            break
        take = min(f["capacity"], remaining)
        selected.append({**f, "assigned_liters": take})
        remaining -= take

    return selected


def _extract_solution(solution, routing, manager,
                       selected_farmers, deliveries,
                       time_windows, departure_sec,
                       driver_start, delivery_start_idx) -> dict:
    """Konvertuje OR-Tools solution u listu stanica sa ETA."""
    time_dim = routing.GetDimensionOrDie("Time")
    stops = []

    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        time_var = time_dim.CumulVar(index)
        arrival_sec = solution.Min(time_var)

        if node == 0:
            index = solution.Value(routing.NextVar(index))
            continue

        arrival_time = _seconds_to_time_str(arrival_sec)

        if node < delivery_start_idx:
            # Mlekara
            f = selected_farmers[node - 1]
            stops.append({
                "type": "pickup",
                "stop_id": f["id"],
                "name": f["name"],
                "address": f["address"],
                "liters": f["assigned_liters"],
                "time": arrival_time,
                "lat": f["lat"],
                "lng": f["lng"],
            })
        else:
            # Kupac
            d = deliveries[node - delivery_start_idx]
            stops.append({
                "type": "delivery",
                "stop_id": d["order_id"],
                "name": d.get("customer_name") or "Kupac",
                "address": d["address"],
                "liters": d["liters"],
                "time": arrival_time,
                "lat": d["lat"],
                "lng": d["lng"],
            })

        index = solution.Value(routing.NextVar(index))

    total_sec = solution.Min(time_dim.CumulVar(routing.End(0))) - departure_sec

    return {
        "status": "success",
        "route": stops,
        "total_liters": sum(d["liters"] for d in deliveries),
        "estimated_duration_minutes": total_sec // 60,
    }


def _seconds_to_time_str(seconds: int) -> str:
    h = (seconds % 86400) // 3600
    m = (seconds % 3600) // 60
    return f"{h:02d}:{m:02d}"