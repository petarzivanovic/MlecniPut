import google.generativeai as genai
import os
import json
import time
from dotenv import load_dotenv
import warnings
from google.api_core import exceptions

# Ignorišemo FutureWarning za google.generativeai
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

load_dotenv()

# 1. PARSIRANJE LISTE KLJUČEVA
api_keys_raw = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
API_KEYS = [k.strip() for k in api_keys_raw.split(",") if k.strip()]
current_key_idx = 0

def setup_next_key():
    """Konfiguriše Gemini sa sledećim dostupnim ključem."""
    global current_key_idx
    if not API_KEYS:
        print("❌ GREŠKA: Nema API ključeva u .env fajlu!")
        return False
    
    key = API_KEYS[current_key_idx]
    genai.configure(api_key=key)
    print(f"🔄 ROTACIJA: Aktivan ključ {current_key_idx + 1}/{len(API_KEYS)}")
    
    current_key_idx = (current_key_idx + 1) % len(API_KEYS)
    return True

# Inicijalizuj prvi ključ pri učitavanju
setup_next_key()

def generisi_rutu(base_city, farmers, buyers, attempt=0):
    # Podešavanje modela (koristi aktuelni ključ)
    model = genai.GenerativeModel('models/gemini-flash-latest')
    
    # POMOĆNA FUNKCIJA ZA ČIŠĆENJE DATUMA
    def serializuj_podatke(obj):
        if isinstance(obj, list):
            return [serializuj_podatke(i) for i in obj]
        if isinstance(obj, dict):
            # Pravimo kopiju da ne menjamo original dok prolazimo kroz njega
            novi_obj = {}
            for k, v in obj.items():
                if hasattr(v, 'isoformat'): 
                    novi_obj[k] = v.isoformat()
                elif isinstance(v, (dict, list)):
                    novi_obj[k] = serializuj_podatke(v)
                else:
                    novi_obj[k] = v
            return novi_obj
        return obj
    
    # Očisti podatke pre slanja u json.dumps
    cisti_farmers = serializuj_podatke(farmers)
    cisti_buyers = serializuj_podatke(buyers)
    
    # Pravimo opis situacije za AI
    prompt = f"""
    You are dispatcher for Mlečni Put milk delivery.
    BASE: {base_city} (start and end point).
    TRUCK_CAPACITY:1500L (maximum milk the truck can carry).
    
    FARMERS(SELLERS): {json.dumps(cisti_farmers)} (each has 'available_milk' – balance pickups to help small producers).
    BUYERS(ORDERS): {json.dumps(cisti_buyers)} (each has 'milk_liters' – deliver to all if possible).
    
    COSTS/PRICING:
    - Purchase price: 80 RSD per liter from farmers.
    - Selling price: 180 RSD per liter to buyers (after 10% PDV tax).
    - Fuel cost: 35 RSD per km.
    - Minimum profit: 1500 RSD per route.
    
    TASK:
    Generate the most profitable route starting and ending at BASE, while looking to pickup milk from different farmers (our purpouse is to help every farmer sell their milk), deliver to ALL buyers if capacity allows. Calculate total profit: (sales revenue - purchase cost - fuel cost). If profit < 1500, mark as 'low'.
    
    RETURN ANSWER ONLY AS JSON:
    {{
        "delivery_order": [
            {{"name": "Farmer A", "id": "farmer_doc_id", "type": "farmer", "liters": 100}},
            {{"name": "Buyer B", "id": "buyer_doc_id", "type": "buyer", "liters": 80}},
            ...
        ], // List of locations (farmer names or buyer names)
        "actions": ["pickup 100L from Farmer A", "deliver 80L to Buyer B", ...],  // Step-by-step actions
        "profitability": "high/medium/low",  // Based on profit
        "total_profit": 2500  // Calculated number
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text_response = response.text
        
        # Čišćenje JSON-a
        if "```json" in text_response:
            text_response = text_response.split("```json")[1].split("```")[0].strip()
        elif "```" in text_response:
            text_response = text_response.split("```")[1].split("```")[0].strip()
        
        return json.loads(text_response)

    except exceptions.ResourceExhausted:
        # KVOTA PUNA - MENJAJ KLJUČ
        if attempt < len(API_KEYS):
            print(f"⚠️ Ključ {current_key_idx} iscrpljen. Menjam ključ i pokušavam ponovo...")
            setup_next_key()
            return generisi_rutu(base_city, farmers, buyers, attempt + 1)
        else:
            print("🛑 Svi ključevi su iscrpljeni. Pauza 60s...")
            time.sleep(60)
            return generisi_rutu(base_city, farmers, buyers, 0)
            
    except Exception as e:
        print(f"❌ Greška pri generisanju AI rute: {e}")
        return None