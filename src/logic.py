from geopy.distance import geodesic
from datetime import datetime
today = datetime.now().date()
from geopy.distance import great_circle
import ai_engine
import firebase_admin
from firebase_admin import credentials, firestore
db = firestore.client(database_id="ai-studio-a689d4b3-aea7-455a-bd08-676f8a2e1c48")
#definisemo centrove grada 
belgrade = (44.7866, 20.4489)
nis = (43.3209, 21.8954)
novi_sad = (45.2396, 19.8227)
radius = 92
MIN_PROFIT=1500
NABAVNA_CENA=80
PDV=0.1
GORIVO=35
PRODAJNA_CENA=180

def filtriraj_narudzbine(orders):
    buyers_belgrade = []
    buyers_nis = []
    buyers_novi_sad = []

    for doc in orders:
        orders_data=doc.to_dict()
        orders_data["order_id"]=doc.id
        order_timestamp = orders_data.get("date_of_order")
        address_of_buyer = orders_data.get("address_of_buyer")
        if order_timestamp:
            # Ako je u bazi Timestamp, on već ima metodu .date()
            # Ako je slučajno string, moraćemo prvo da ga konvertujemo (vidi ispod)
            try:
                order_date = order_timestamp.date()
            except AttributeError:
                # U slucaju da je ipak ostao string u nekom dokumentu
                #prilagodi format "March 28, 2003"
                order_date =  datetime.strptime(order_timestamp.split(" at")[0], "%B %d, %Y").date()
            if order_date == today:
                if is_within_radius(*address_of_buyer, *belgrade,92):
                    buyers_belgrade.append(orders_data) 
                elif is_within_radius(*address_of_buyer, *nis,92):
                    buyers_nis.append(orders_data)
                elif is_within_radius(*address_of_buyer, *novi_sad,92):
                    buyers_novi_sad.append(orders_data)      
    
    return {
        "belgrade":buyers_belgrade,
        "nis": buyers_nis,
        "novi_sad": buyers_novi_sad
        
    }

def filtriraj_farmere(farmers):
    farmers_belgrade = []
    farmers_nis = []
    farmers_novi_sad = []
    
    for doc in farmers:
        farmers_data = doc.to_dict()
        farmers_data["id"] = doc.id  # Dodaj ID dokumenta
        address_of_farm = farmers_data.get("location")
        if is_within_radius(*address_of_farm, *belgrade,92):
            farmers_belgrade.append(farmers_data) 
        elif is_within_radius(*address_of_farm, *nis,92):
            farmers_nis.append(farmers_data)
        elif is_within_radius(*address_of_farm, *novi_sad,92):
            farmers_novi_sad.append(farmers_data)
    return {
        "belgrade":farmers_belgrade,
        "nis": farmers_nis,
        "novi_sad": farmers_novi_sad
    }
        

# Proveravamo kome gradu pripada porudzbina
def is_within_radius(lat, lon, center_lat, center_lon, radius_km):
    center = (center_lat, center_lon)
    target = (lat, lon)
    # great_circle calculates the distance over a spherical earth
    distance = great_circle(center, target).km
    
    return distance <= radius_km

def izracunaj_udaljenost(tacka_a, tacka_b):
    """_summary_
        vraca udaljenosti 
    Args:
        tacka_a (_type_): latitude
        tacka_b (_type_): longitude
    """
    return geodesic(tacka_a, tacka_b).km

def proveri_isplativost(litri,km):
    """Da li nam se isplati da palimo kamion"""
    zarada_po_litru=PRODAJNA_CENA*(1-PDV)-NABAVNA_CENA
    trosak_po_km=GORIVO
    
    ukupna_zarada= litri*zarada_po_litru
    ukupni_trosak= km*trosak_po_km
    
    # Ako je zarada veca od troska vracamo True
    return (ukupna_zarada - ukupni_trosak)>MIN_PROFIT
    
def posalji_rutu(city_centers,ordered_orders,ordered_farmers):
    routes = {}
    for city, coordinates in city_centers.items():
        buyers = ordered_orders[city]
        farmers = ordered_farmers[city]

        if buyers and farmers:
            print(f"\n Generišem rutu za {city.upper()}...")

            # Pozivamo AI engine za taj specifičan grad
            route = ai_engine.generisi_rutu(coordinates, farmers, buyers)
            for buyer in buyers:
                try:
                    db.collection("orders").document(buyer['order_id']).update({"status": "assigned"})
                except Exception as e:
                    print(f"Greška pri update-u order-a {buyer['order_id']}: {e}")
            print(f" Ruta za {city.upper()} spremna!")
            routes[city] = route
        else:
            print(f"\n Za {city.upper()} danas nema dovoljno podataka")
            routes[city]=None
    return routes
    
def azuriraj_stanje_mleka_u_bazi(route_data):
    """
    Prolazi kroz generisanu rutu i oduzima litre od farmera u Firebase-u.
    """
    
    if not route_data or 'delivery_order' not in route_data:
        print("⚠️ Nema podataka za ažuriranje.")
        return

    for stop in route_data['delivery_order']:
        doc_id = stop.get('id')
        liters = stop.get('liters', 0)
        stop_type = stop.get('type')

        if not doc_id or liters <= 0:
            continue

        try:
            if stop_type == 'farmer':
                # Oduzimamo od dostupnog mleka (Increment sa minusom)
                print(f"🚜 Farmer {stop['name']}: Oduzimam {liters}L")
                db.collection("sellers").document(doc_id).update({
                    "total_stock": firestore.Increment(-liters)
                })
            
            elif stop_type == 'buyer':
                # Opciono: Možeš i kupcima da smanjiš potražnju ili promeniš status
                print(f"🚛 Kupac {stop['name']}: Isporučeno {liters}L")
                db.collection("orders").document(doc_id).update({
                    "status": "completed",
                    "delivered_liters": liters
                })
        except Exception as e:
            print(f"❌ Greška pri ažuriranju dokumenta {doc_id}: {e}")