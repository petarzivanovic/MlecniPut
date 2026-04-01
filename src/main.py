import firebase_admin
from firebase_admin import credentials, firestore
# Povezujemo Firebase 
cred = credentials.Certificate("../data/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
import os
from dotenv import load_dotenv
import logic
import ai_engine
import db_manager
# Učitavamo .env
load_dotenv()
#definisemo centrove grada
city_centers = {
    "belgrade": (44.7866, 20.4489),
    "nis": (43.3209, 21.8954),
    "novi_sad": (45.2396, 19.8227)
}





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
print(f"Danas u Beogradu imamo {len(ordered_orders['belgrade'])} narudžbina.")



print ("\n --- AI ANALIZA PROFITA PO FARMAMA ---")
    # Ovde pozivamo Gemini za rutu

routes = logic.posalji_rutu(city_centers, ordered_orders, ordered_farmers)
for city in city_centers:
    db_manager.sacuvaj_rutu_u_bazu(city, routes[city])



