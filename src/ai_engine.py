import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

#Konfiguracije Gemini-ja
genai.configure(api_key=os.getenv("GEMINI_APY_KEY"))
model=genai.GenerativeModel('gemini-1.5-flash')

def generisi_rutu(base_city, farmers, buyers):
    #Pravimo opis situacije za AI
    prompt = f"""
    You are dispatcher for Mlečni Put
    BASE: {base_city}
    TRUCK_CAPACITY: 500L
    
    FARMERS(SELLERS): {json.dumps(farmers)}
    BUYERS(ORDERS): {json.dumps(buyers)}
    
    TASK:
    Make most effective route. Truck departs from BASE, takes milk from farmer(sellers) until takes his maximum capacity, or 
    takes enough for all buyers.
    
    RETURN ANSWER ONLY AS JSON:
    {{
        "delivery_order":["Ime tacke 1","Ime tacke 2"],
        "actions":["pokupi 100L","Dostavi 80L"]
        "profitability":"visoka/srednja/niska"
    }}
    """
    response = model.generate_content(prompt)
    text_response = response.text
    if "```json" in text_response:
        text_response=text_response.split("```json")[1].split("```")[0].strip()
    elif "```" in text_response:
        text_response=text_response.split("```")[1].split("```").strip()
    try:
        # Pretvaramo string u pravi Python recnik (dict)
        return json.loads(text_response)
    except Exception as e:
        print("Greska pri parsiranju AI odgovora: {e}")
        return None



