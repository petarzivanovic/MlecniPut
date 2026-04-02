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
    
    # Pretvaramo liste u tekst da bi AI mogao da ih pročita
    supplies_str = json.dumps(payload.supplies, ensure_ascii=False)
    orders_str = json.dumps(payload.orders, ensure_ascii=False)
    
    # MASTER INSTRUKCIJE ZA AI DISPEČERA
    system_prompt = """
    Ti si AI logistički dispečer za srpsku kompaniju 'Mlečni put'.
    Praviš optimalnu dnevnu rutu za vozača na osnovu ponude (mlekari) i potražnje (kupci).
    
    PRAVILA:
    1. Vozač prvo ide kod mlekara (type: pickup) da pokupi mleko, pa tek onda kod kupaca (type: delivery).
    2. Radni dan počinje u 07:00. Daj svakoj stanici logično vreme (time).
    3. Tvoj odgovor MORA biti isključivo JSON format koji sadrži ključ "stops" sa listom stanica.
    Format jedne stanice: {"type": "pickup/delivery", "name": "Ime", "address": "Adresa", "liters": broj, "time": "HH:MM"}
    """
    
    user_prompt = f"Ponuda (Mlekari): {supplies_str}\nPotražnja (Kupci): {orders_str}"
    
    try:
        # Zovemo ChatGPT (gpt-4o) da izračuna rutu
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" }, # Naređujemo mu da vrati čist JSON
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        
        # Čitamo šta je AI odgovorio
        ai_route_json = json.loads(response.choices[0].message.content)
        
        # Vraćamo rutu Lovable-u
        return {
            "status": "success",
            "route": ai_route_json["stops"]
        }
        
    except Exception as e:
        print(f"Greška: {e}")
        return {"status": "error", "message": str(e)}