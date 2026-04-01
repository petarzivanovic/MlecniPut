import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
import logic
import ai_engine
# Učitavamo .env
load_dotenv()
#definisemo centrove grada
city_centers = {
    "belgrade": (44.7866, 20.4489),
    "nis": (43.3209, 21.8954),
    "novi_sad": (45.2396, 19.8227)
}



# Povezujemo Firebase (pazi da je fajl u istom folderu kao main.py)
cred = credentials.Certificate("../data/serviceAccountKey.json")
firebase_admin.initialize_app(cred)

#povezivanje sa bazom
db = firestore.client(database_id="ai-studio-a689d4b3-aea7-455a-bd08-676f8a2e1c48")

print("--- USPEŠNO POVEZANO SA MLEKOPUT BAZOM ---")

# 0 Uzimamo orders za ovaj dan
orders_ref = db.collection("orders")
orders= orders_ref.stream()
ordered_orders = logic.filtriraj_narudzbine(orders)

        

# 1.1 Uzimamo farmere iz baze
farmers_ref = db.collection("sellers")
farmers =  farmers_ref.stream()
ordered_farmers = logic.filtriraj_farmere(farmers)

# Pristupanje podacima
print(f"Danas u Beogradu imamo {len(ordered_orders['beograd'])} narudžbina.")



print ("\n --- AI ANALIZA PROFITA PO FARMAMA ---")
    # Ovde pozivamo Gemini za rutu

for city, coordinates in city_centers.items():
    buyers= ordered_orders[city]
    farmers= ordered_farmers[city]

    if buyers and farmers:
        print(f"\n Generišem rutu za {city.upper()}...")
        
        # Pozivamo AI engine za taj specifičan grad
        route = ai_engine.generisi_rutu(coordinates, farmers, buyers)
        
        print(f" Ruta za {city.upper()} spremna!")
        print(route)
    else:
        print(f"\n Za {city.upper()} danas nema dovoljno podataka")


# for doc in farmers:
#     farmers_data=doc.to_dict()
#     farm_name = farmers_data.get("farm_name", "Nema Imena")
#     location = farmers_data.get("location",[0,0])
#     farm_coords = (location[0],location[1])
    
#     udaljenost= logic.izracunaj_udaljenost(beograd, farm_coords)
    
#     isplati_se = logic.proveri_isplativost(beograd, farm_coords)
    
    
#     if(isplati_se):
#         status="ISPLATIVO"
#     else:
#         status=" NEISPLATIVO"
        
#     print(f"Farma: {farm_name:20} | Distance: {udaljenost:.2f}km | Status: {status}")

    
    
