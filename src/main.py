import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
import logic

# Učitavamo .env
load_dotenv()

# Povezujemo Firebase (pazi da je fajl u istom folderu kao main.py)
cred = credentials.Certificate("../data/serviceAccountKey.json")
firebase_admin.initialize_app(cred)

#povezivanje sa bazom
db = firestore.client(database_id="ai-studio-a689d4b3-aea7-455a-bd08-676f8a2e1c48")

print("--- USPEŠNO POVEZANO SA MLEKOPUT BAZOM ---")

# 1. Uzimamo farmere iz baze
users_ref = db.collection("users")
query = users_ref.where("role","==","seller")
results =  query.stream()

print ("\n --- AI ANALIZA PROFITA PO FARMAMA ---")

for doc in results:
    user_data=doc.to_dict()
    farm_name = user_data.get("farmInfo",{}).get("farmName", "Nema Imena")
    
    # 2. spajanje sa matematikom
    #Za test uzimamo 120L mleka i recimo da je farma udaljena 45km 
    test_litri=120
    test_km=45
    
    isplati_se = logic.proveri_isplativost(test_litri, test_km)
    udaljenost_tekst = f"{test_km}km"
    
    if(isplati_se):
        status="ISPLATIVO"
    else:
        status=" NEISPLATIVO"
        
    print(f"Farma: {farm_name:20} | Distance: {udaljenost_tekst:6} | Status: {status}")
    
# KORAK 4: Test funkcije za udaljenost (Geopy)
# Beograd (44.78, 20.44) do tvoje lokacije u bazi (ako je imaš)
beograd = (44.7866, 20.4489)