import firebase_admin
from firebase_admin import credentials, firestore

db = firestore.client(database_id="ai-studio-a689d4b3-aea7-455a-bd08-676f8a2e1c48")

def sacuvaj_rutu_u_bazu(city, route_data):
    if not route_data:
        return
    
    #dodajemo meta podatke (Vreme i grad)
    route_data["city"] = city
    route_data["timestamp"] = firestore.SERVER_TIMESTAMP
    route_data["status"] = "active"
    
    # Upisujemo  u novu kolekciju routes
    new_route_ref = db.collection("routes").add(route_data)
    print(f"Ruta za {city.upper()} uspesno sacuvana u Firebase! ID:, {new_route_ref[1].id if isinstance(new_route_ref, tuple) else new_route_ref.id}")
    
    return new_route_ref[1].id if isinstance(new_route_ref, tuple) else new_route_ref.id
