import os
from datetime import date, datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from supabase import create_client, Client
import pandas as pd
from prophet import Prophet
import httpx
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# --- Konekcija ka Supabase bazi ---
# Kredencijali se citaju iz environment varijabli
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")

supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Kreiranje FastAPI aplikacije ---
app = FastAPI()

# --- CORS middleware ---
# Dozvoljava React frontend-u da komunicira sa ovim API-jem
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health check endpoint ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Server je aktivan"}


# --- Pomocna async funkcija za Mapbox Time Matrix ---
async def get_time_matrix(coordinates):
    """
    Prima listu GPS koordinata [(lng, lat), (lng, lat), ...].
    Vraca 2D matricu vremena putovanja u sekundama.
    Koristi Mapbox Matrix API sa chunking logikom (limit 25 lokacija po pozivu).
    """
    n = len(coordinates)

    # Prazna NxN matrica popunjena nulama
    matrix = [[0] * n for _ in range(n)]

    if n == 0:
        return matrix

    # Chunk velicina 12 - dva chunk-a zajedno imaju max 24 koordinate (< 25 limit)
    chunk_size = 12

    # Podela indeksa koordinata u grupe (chunk-ove)
    chunks = []
    for start in range(0, n, chunk_size):
        end = min(start + chunk_size, n)
        chunks.append(list(range(start, end)))

    # Za svaki par chunk-ova pozivamo Mapbox API
    async with httpx.AsyncClient() as client:
        for i, src_indices in enumerate(chunks):
            for j, dst_indices in enumerate(chunks):

                # Spajamo koordinate iz oba chunk-a
                if i == j:
                    # Isti chunk - saljemo jednom, sources i destinations su isti
                    combined_indices = src_indices
                    src_positions = list(range(len(src_indices)))
                    dst_positions = list(range(len(dst_indices)))
                else:
                    # Razliciti chunk-ovi - spajamo ih u jednu listu
                    combined_indices = src_indices + dst_indices
                    src_positions = list(range(len(src_indices)))
                    dst_positions = list(range(len(src_indices), len(combined_indices)))

                # Formatiranje koordinata za URL: lng,lat;lng,lat;...
                coords_str = ";".join(
                    f"{coordinates[idx][0]},{coordinates[idx][1]}"
                    for idx in combined_indices
                )

                sources_param = ";".join(str(p) for p in src_positions)
                destinations_param = ";".join(str(p) for p in dst_positions)

                url = (
                    f"https://api.mapbox.com/directions-matrix/v1/mapbox/driving/{coords_str}"
                    f"?sources={sources_param}"
                    f"&destinations={destinations_param}"
                    f"&access_token={MAPBOX_TOKEN}"
                )

                response = await client.get(url)
                data = response.json()

                durations = data["durations"]

                # Upisivanje vrednosti u odgovarajuce pozicije matrice
                for si, src_idx in enumerate(src_indices):
                    for di, dst_idx in enumerate(dst_indices):
                        matrix[src_idx][dst_idx] = durations[si][di]

    # Dijagonala uvek mora biti 0 (rastojanje od tacke do same sebe)
    for i in range(n):
        matrix[i][i] = 0

    return matrix


# --- Solver za rutiranje hladnjaca (Pickup and Delivery with Time Windows) ---
async def solve_milk_routing(data):
    """
    Resava Pickup and Delivery Problem with Time Windows (PDPTW).

    Parametar 'data' je recnik sa sledecim kljucevima:
      - time_matrix: 2D lista vremena putovanja u sekundama izmedju lokacija
      - pickups_deliveries: lista parova [pickup_index, delivery_index]
      - num_vehicles: broj hladnjaca
      - depot: indeks depoa (polazna tacka hladnjaca)
      - demands: lista kolicina za svaku lokaciju (+ za pickup, - za delivery)
      - vehicle_capacity: maksimalni kapacitet jedne hladnjace u litrima
      - service_time: vreme zadrzavanja na lokaciji u sekundama (npr. 600 = 10 min)
    """

    num_locations = len(data["time_matrix"])
    num_vehicles = data["num_vehicles"]
    depot = data["depot"]

    # --- Korak 1: Kreiranje RoutingIndexManager-a ---
    # On mapira interne indekse routing modela na nase stvarne indekse lokacija
    manager = pywrapcp.RoutingIndexManager(
        num_locations,
        num_vehicles,
        depot
    )

    # --- Korak 2: Kreiranje RoutingModel-a ---
    routing = pywrapcp.RoutingModel(manager)

    # --- Korak 3: Callback za vreme putovanja ---
    # Ova funkcija vraca vreme putovanja izmedju dve lokacije + vreme zadrzavanja
    service_time = data.get("service_time", 600)  # podrazumevano 10 minuta

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        travel = data["time_matrix"][from_node][to_node]
        # Dodajemo service_time na svakoj lokaciji osim depoa
        service = service_time if from_node != depot else 0
        return int(travel + service)

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # --- Korak 4: Dodavanje vremenske dimenzije ---
    max_route_time = 8 * 3600  # 8 sati u sekundama = 28800 sekundi

    routing.AddDimension(
        transit_callback_index,
        3600,           # dozvoljeno cekanje (slack) do 1 sat
        max_route_time, # maksimalno vreme na jednoj ruti
        True,           # kumulativno vreme pocinje od 0
        "Time"
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    # --- Korak 5: Dodavanje kapaciteta (demand callback) ---
    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return data["demands"][from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,  # nema slack-a za kapacitet
        [data["vehicle_capacity"]] * num_vehicles,
        True,
        "Capacity"
    )

    # --- Korak 6: Pickup and Delivery ogranicenja ---
    # Svaki par (pickup, delivery) mora biti na istoj ruti iste hladnjace
    for pickup, delivery in data["pickups_deliveries"]:
        pickup_index = manager.NodeToIndex(pickup)
        delivery_index = manager.NodeToIndex(delivery)

        # Ista hladnjaca mora obaviti i pickup i delivery
        routing.AddPickupAndDelivery(pickup_index, delivery_index)

        # Pickup mora biti pre delivery-ja na ruti
        routing.solver().Add(
            time_dimension.CumulVar(pickup_index)
            <= time_dimension.CumulVar(delivery_index)
        )

        # Oba moraju biti na istom vozilu
        routing.solver().Add(
            routing.VehicleVar(pickup_index)
            == routing.VehicleVar(delivery_index)
        )

    # --- Korak 6b: Stop Reduction (disjunkcije sa penalima) ---
    # Ako je trosak voznje do mlekare veci od profita, solver ga izbacuje sa rute
    CENA_PO_LITRU = 50  # RSD po litru mleka

    # Skupljamo indekse svih pickup i delivery cvorova
    pickup_nodes = set()
    delivery_nodes = set()
    for pickup, delivery in data["pickups_deliveries"]:
        pickup_nodes.add(pickup)
        delivery_nodes.add(delivery)

    for pickup, delivery in data["pickups_deliveries"]:
        pickup_index = manager.NodeToIndex(pickup)
        delivery_index = manager.NodeToIndex(delivery)

        # Pickup (mlekara): penal = profit od te kolicine mleka
        kolicina = abs(data["demands"][pickup])
        profit = int(kolicina * CENA_PO_LITRU)
        routing.AddDisjunction([pickup_index], profit)

        # Delivery (kupac): veoma visok penal - isporuka mora biti obavljena
        routing.AddDisjunction([delivery_index], 1_000_000)

    # --- Korak 7: Podesavanje parametara pretrage ---
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.FromSeconds(30)  # max 30 sekundi za pretragu

    # --- Korak 8: Pokretanje solvera ---
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return {"status": "no_solution", "rute": []}

    # --- Korak 9: Izvlacenje ruta iz resenja ---
    rute = []
    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        ruta = []
        route_time = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            time_var = time_dimension.CumulVar(index)
            ruta.append({
                "lokacija_index": node,
                "vreme_dolaska_sec": solution.Value(time_var),
            })
            index = solution.Value(routing.NextVar(index))

        # Dodaj i krajnju tacku (povratak u depo)
        node = manager.IndexToNode(index)
        time_var = time_dimension.CumulVar(index)
        route_time = solution.Value(time_var)
        ruta.append({
            "lokacija_index": node,
            "vreme_dolaska_sec": route_time,
        })

        # Dodaj rutu samo ako ima vise od 2 tacke (depo -> nesto -> depo)
        if len(ruta) > 2:
            rute.append({
                "vehicle_id": vehicle_id,
                "ruta": ruta,
                "ukupno_vreme_sec": route_time,
                "ukupno_vreme_min": round(route_time / 60, 1),
            })

    return {
        "status": "solved",
        "broj_aktivnih_vozila": len(rute),
        "rute": rute,
    }


# --- Mapiranje dana u nedelji (engleski -> srpski) ---
DANI_U_NEDELJI = {
    0: "ponedeljak",
    1: "utorak",
    2: "sreda",
    3: "cetvrtak",
    4: "petak",
    5: "subota",
    6: "nedelja",
}


# --- Daily logistics endpoint ---
@app.get("/api/daily-logistics/{target_date}")
def get_daily_logistics(target_date: str):
    """
    Za zadati datum vraca:
    - mlekare koje su prijavile dostupno mleko (iz tabele daily_supply)
    - aktivne kupce ciji se dan isporuke poklapa sa danom u nedelji (iz tabele subscriptions)
    """

    # Provera da li je Supabase konekcija uspostavljena
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase konekcija nije uspostavljena")

    # Parsiranje datuma iz URL-a (format: YYYY-MM-DD)
    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Neispravan format datuma. Koristite YYYY-MM-DD")

    # Odredjivanje dana u nedelji za zadati datum
    dan_u_nedelji = DANI_U_NEDELJI[parsed_date.weekday()]

    # 1) Povlacenje mlekara iz tabele daily_supply za zadati datum
    supply_response = supabase.table("daily_supply").select(
        "id, dairy_id, latitude, longitude, quantity_liters"
    ).eq("date", target_date).execute()

    mlekare = supply_response.data

    # 2) Povlacenje aktivnih kupaca ciji se dan isporuke poklapa
    subscriptions_response = supabase.table("subscriptions").select(
        "id, customer_id, latitude, longitude, quantity_liters, delivery_days"
    ).eq("is_active", True).execute()

    # Filtriranje kupaca ciji delivery_days sadrzi trazeni dan
    kupci = []
    for sub in subscriptions_response.data:
        delivery_days = sub.get("delivery_days", [])
        if dan_u_nedelji in delivery_days:
            kupci.append(sub)

    # Vracanje strukturiranog odgovora
    return {
        "target_date": target_date,
        "dan_u_nedelji": dan_u_nedelji,
        "mlekare": mlekare,
        "broj_mlekara": len(mlekare),
        "kupci": kupci,
        "broj_kupaca": len(kupci),
    }


# --- Marketing forecast endpoint ---
@app.get("/api/marketing-forecast")
def marketing_forecast():
    """
    Koristi Facebook Prophet da predvidi potraznju mleka za narednih 30 dana
    na osnovu istorijskih podataka iz tabele 'orders'.
    """

    # Provera konekcije
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase konekcija nije uspostavljena")

    # Povlacenje istorijskih podataka iz tabele orders
    response = supabase.table("orders").select("delivery_date, quantity_liters").execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Nema istorijskih podataka u tabeli orders")

    # Grupisanje ukupne litrazze po datumu
    df = pd.DataFrame(response.data)
    df["delivery_date"] = pd.to_datetime(df["delivery_date"])
    df = df.groupby("delivery_date")["quantity_liters"].sum().reset_index()

    # Preimenovanje kolona u format koji Prophet ocekuje: ds (datum) i y (vrednost)
    df = df.rename(columns={"delivery_date": "ds", "quantity_liters": "y"})

    # Sortiranje po datumu
    df = df.sort_values("ds")

    # Kreiranje i treniranje Prophet modela
    model = Prophet(seasonality_mode="additive")
    model.fit(df)

    # Predikcija za narednih 30 dana
    future = model.make_future_dataframe(periods=30)
    forecast = model.predict(future)

    # Izdvajanje samo buducih datuma (predikcija)
    poslednji_datum = df["ds"].max()
    buduci = forecast[forecast["ds"] > poslednji_datum]

    # Formatiranje rezultata za frontend
    rezultat = []
    for _, red in buduci.iterrows():
        rezultat.append({
            "datum": red["ds"].strftime("%Y-%m-%d"),
            "ocekivana_potraznja": round(red["yhat"], 2),
            "donja_granica": round(red["yhat_lower"], 2),
            "gornja_granica": round(red["yhat_upper"], 2),
        })

    return {
        "broj_istorijskih_dana": len(df),
        "predikcija_dana": len(rezultat),
        "forecast": rezultat,
    }


# --- Pydantic modeli za optimize-route request ---
class Lokacija(BaseModel):
    id: str
    latitude: float
    longitude: float
    quantity_liters: float

class OptimizeRouteRequest(BaseModel):
    depot_latitude: float
    depot_longitude: float
    mlekare: List[Lokacija]
    kupci: List[Lokacija]
    num_vehicles: int = 3
    vehicle_capacity: int = 2000
    polazak_sati: int = 7    # sat pocetka rute (podrazumevano 07:00)
    polazak_minuta: int = 0


# --- Optimize route endpoint ---
@app.post("/api/optimize-route")
async def optimize_route(req: OptimizeRouteRequest):
    """
    Prima listu mlekara (ponuda) i kupaca (traznja) sa GPS koordinatama.
    Vraca optimizovane rute za hladnjace.
    """

    if not req.mlekare and not req.kupci:
        raise HTTPException(status_code=400, detail="Morate poslati bar jednu mlekaru i jednog kupca")

    # --- Korak 1: Izgradnja liste lokacija ---
    # Redosled: [depo, mlekara_0, mlekara_1, ..., kupac_0, kupac_1, ...]
    lokacije = []

    # Indeks 0 = depo
    lokacije.append({
        "id": "depot",
        "tip": "depot",
        "latitude": req.depot_latitude,
        "longitude": req.depot_longitude,
        "quantity_liters": 0,
    })

    # Dodajemo mlekare (pickup tacke)
    for m in req.mlekare:
        lokacije.append({
            "id": m.id,
            "tip": "pickup",
            "latitude": m.latitude,
            "longitude": m.longitude,
            "quantity_liters": m.quantity_liters,
        })

    # Dodajemo kupce (delivery tacke)
    for k in req.kupci:
        lokacije.append({
            "id": k.id,
            "tip": "delivery",
            "latitude": k.latitude,
            "longitude": k.longitude,
            "quantity_liters": k.quantity_liters,
        })

    # --- Korak 2: Priprema koordinata za Mapbox ---
    coordinates = [
        (lok["longitude"], lok["latitude"])
        for lok in lokacije
    ]

    # --- Korak 3: Poziv Mapbox Matrix API-ja ---
    time_matrix = await get_time_matrix(coordinates)

    # --- Korak 4: Priprema demands liste ---
    # Depo = 0, pickup (mlekara) = +kolicina, delivery (kupac) = -kolicina
    demands = [0]  # depo
    for m in req.mlekare:
        demands.append(int(m.quantity_liters))      # pickup: pozitivna vrednost
    for k in req.kupci:
        demands.append(-int(k.quantity_liters))     # delivery: negativna vrednost

    # --- Korak 5: Kreiranje pickup-delivery parova ---
    # Svaku mlekaru uparujemo sa kupcem po redu
    # Ako ima vise mlekara nego kupaca (ili obrnuto), parimo koliko mozemo
    pickups_deliveries = []
    num_pairs = min(len(req.mlekare), len(req.kupci))
    for i in range(num_pairs):
        pickup_index = 1 + i                              # mlekare pocinu od indeksa 1
        delivery_index = 1 + len(req.mlekare) + i         # kupci pocinu posle mlekara
        pickups_deliveries.append([pickup_index, delivery_index])

    # --- Korak 6: Formiranje data recnika za solver ---
    data = {
        "time_matrix": time_matrix,
        "pickups_deliveries": pickups_deliveries,
        "num_vehicles": req.num_vehicles,
        "depot": 0,
        "demands": demands,
        "vehicle_capacity": req.vehicle_capacity,
        "service_time": 600,  # 10 minuta zadrzavanja po lokaciji
    }

    # --- Korak 7: Pokretanje solvera ---
    result = await solve_milk_routing(data)

    if result["status"] == "no_solution":
        raise HTTPException(status_code=422, detail="Solver nije pronasao resenje za date podatke")

    # --- Korak 8: Obogacivanje ruta sa detaljima lokacija i satnicama ---
    # Racunamo ETA kao polazak + kumulativno vreme u sekundama
    polazak_minuta_ukupno = req.polazak_sati * 60 + req.polazak_minuta

    for ruta_info in result["rute"]:
        obogacena_ruta = []
        for stop in ruta_info["ruta"]:
            idx = stop["lokacija_index"]
            lok = lokacije[idx]
            eta_sec = stop["vreme_dolaska_sec"]

            # Racunanje satnice: polazak + ETA sekunde -> sati:minuti
            ukupno_min = polazak_minuta_ukupno + (eta_sec // 60)
            sat = (ukupno_min // 60) % 24
            minut = ukupno_min % 60
            satnica = f"{sat:02d}:{minut:02d}"

            # Opis akcije za frontend
            if lok["tip"] == "pickup":
                opis = f"{satnica} - Preuzimanje {lok['id']} ({lok['quantity_liters']}L)"
            elif lok["tip"] == "delivery":
                opis = f"{satnica} - Isporuka {lok['id']} ({lok['quantity_liters']}L)"
            else:
                opis = f"{satnica} - Depo"

            obogacena_ruta.append({
                "id": lok["id"],
                "tip": lok["tip"],
                "latitude": lok["latitude"],
                "longitude": lok["longitude"],
                "quantity_liters": lok["quantity_liters"],
                "eta_seconds": eta_sec,
                "eta_minutes": round(eta_sec / 60, 1),
                "satnica": satnica,
                "opis": opis,
            })
        ruta_info["ruta"] = obogacena_ruta

    return {
        "status": "solved",
        "broj_lokacija": len(lokacije),
        "broj_aktivnih_vozila": result["broj_aktivnih_vozila"],
        "rute": result["rute"],
    }


# --- Pydantic model za driver location ---
class DriverLocationRequest(BaseModel):
    driver_id: str
    latitude: float
    longitude: float


# --- Driver location endpoint ---
@app.post("/api/driver-location")
def update_driver_location(req: DriverLocationRequest):
    """
    Prima ID vozaca i GPS koordinate.
    Upisuje (upsert) lokaciju u Supabase tabelu 'locations'.
    Supabase Realtime automatski salje novu lokaciju frontendu.
    """

    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase konekcija nije uspostavljena")

    # Upsert - ako red sa tim driver_id vec postoji, azurira ga; ako ne, kreira novi
    supabase.table("locations").upsert({
        "driver_id": req.driver_id,
        "latitude": req.latitude,
        "longitude": req.longitude,
    }).execute()

    return {"status": "ok", "driver_id": req.driver_id}
