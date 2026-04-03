import os
import json
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI

# 1. Učitavamo skriveni ključ iz .env fajla
load_dotenv()

app = FastAPI()

# 2. Palimo OpenAI klijent
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 3. Dozvoljavamo tvom sajtu (Lovable) da priča sa Pythonom
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Kako izgleda "paket" koji nam Lovable šalje
class RouteRequest(BaseModel):
    driver_id: str
    selected_date: str
    supplies: List[Dict[str, Any]]
    orders: List[Dict[str, Any]]

# 5. Glavna funkcija za računanje rute
@app.post("/api/generate-route")
async def generate_route(payload: RouteRequest):
    print(f"--- AI RAČUNA RUTU ZA VOZAČA: {payload.driver_id} ---")
    
    # 1. MATEMATIKA: Izračunaj ukupnu potražnju svih kupaca
    # Pretpostavka je da tvoji orderi i supplies imaju ključ "liters"
    total_demand = sum(order.get('liters', 0) for order in payload.orders)
    
    # 2. PRILAGOĐAVANJE PONUDE: Uzimamo mleko redom dok ne ispunimo potražnju
    adjusted_supplies = []
    collected_milk = 0
    
    for supply in payload.supplies:
        available = supply.get('liters', 0)
        
        # Ako nam treba svo mleko od ovog mlekara
        if collected_milk + available <= total_demand:
            adjusted_supplies.append(supply)
            collected_milk += available
        else:
            # Ako nam treba samo deo mleka od ovog mlekara da bi namirili potražnju
            needed = total_demand - collected_milk
            if needed > 0:
                # Menjamo količinu na tačno onoliko koliko nam fali
                supply['liters'] = needed
                adjusted_supplies.append(supply)
                collected_milk += needed
            break # Skupili smo tačno koliko nam treba, prekidamo petlju
    
    # Sada pretvaramo PRILAGOĐENE liste u tekst
    supplies_str = json.dumps(adjusted_supplies, ensure_ascii=False)
    orders_str = json.dumps(payload.orders, ensure_ascii=False)
    
    # MASTER INSTRUKCIJE ZA AI DISPEČERA
    system_prompt = """
    Ti si AI logistički dispečer za srpsku kompaniju 'Mlečni put'.
    Praviš optimalnu dnevnu rutu za vozača na osnovu ponude (mlekari) i potražnje (kupci).
    
    PRAVILA:
    1. Vozač prvo ide kod mlekara (type: pickup) da pokupi mleko, pa tek onda kod kupaca (type: delivery).
    2. Radni dan počinje u 07:00. Daj svakoj stanici logično vreme (time).
    3. UKUPNA količina litara koju vozač preuzima mora biti TAČNO JEDNAKA ukupnoj količini koju isporučuje.
    4. Tvoj odgovor MORA biti isključivo JSON format koji sadrži ključ "stops" sa listom stanica.
    Format jedne stanice: {"type": "pickup/delivery", "name": "Ime", "address": "Adresa", "liters": broj, "time": "HH:MM"}
    """
    
    # Dodajemo total_demand u prompt čisto da AI ima kontekst o ukupnoj brojci
    user_prompt = f"Potrebno je tačno {total_demand} litara.\nPonuda (Mlekari): {supplies_str}\nPotražnja (Kupci): {orders_str}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        
        ai_route_json = json.loads(response.choices[0].message.content)
        
        return {
            "status": "success",
            "route": ai_route_json["stops"]
        }
        
    except Exception as e:
        print(f"Greška: {e}")
        return {"status": "error", "message": str(e)}


#nvo

class PredictionRequest(BaseModel):
    subscriptions: List[Dict[str, Any]]
    orders: List[Dict[str, Any]]

@app.post("/api/predict-demand")
async def predict_demand(payload: PredictionRequest):
    print("--- AI PRAVI PREDIKCIJU POTRAŽNJE ---")
    
    subs_str = json.dumps(payload.subscriptions, ensure_ascii=False)
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
    "farmer_message": "Poruka mlekaru na srpskom koji dan je najveca potraznja da bi on znao kada moze da proda najvise mleka u toj nedelji",
    "customer_prediction": "Kratka rečenica upozorenja na srpskom, npr: Očekujemo najveću potražnju u sredu — naruči do utorka da osiguraš svoju dostavu."
    }
    """
    
    user_prompt = f"Aktivne pretplate: {subs_str}\nJednokratne narudžbine: {orders_str}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        
        result = json.loads(response.choices[0].message.content)
        return {"status": "success", "prediction": result}
        
    except Exception as e:
        print(f"Greška: {e}")
        return {"status": "error", "message": str(e)}
