import firebase_admin
from firebase_admin import credentials, firestore

# 1. Inicijalizacija (mora i ovde da bi skripta radila samostalno)
if not firebase_admin._apps:
    cred = credentials.Certificate("../data/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client(database_id="ai-studio-a689d4b3-aea7-455a-bd08-676f8a2e1c48")

def add_test_data():
    # 2. DODAJEMO SELERE (FARMERE)
    new_sellers = [
        {
            "farm_name": "Horti Farma",
            "is_active": True,
            "location": [44.9284, 20.2531], # Batajnica zona
            "preffered_time": "07:00",
            "total_stock": 450
        },
        {
            "farm_name": "Avalska Rosa",
            "is_active": True,
            "location": [44.6542, 20.5015], # Avala zona
            "preffered_time": "08:30",
            "total_stock": 520
        }
    ]

    # 3. DODAJEMO BUYERE (KUPCE)
    new_buyers = [
        {
            "display_name": "Kupac Novi Beograd",
            "is_active": True,
            "location": [44.8194, 20.4074],
            "weekly_litters": 4,
            "delivery_days": ["Monday", "Wednesday", "Friday"]
        },
        {
            "display_name": "Kupac Zvezdara",
            "is_active": True,
            "location": [44.8012, 20.5055],
            "weekly_litters": 6,
            "delivery_days": ["Tuesday", "Thursday"]
        }
    ]

    # Slanje u bazu
    for s in new_sellers:
        db.collection("sellers").add(s)
        print(f"Dodata farma: {s['farm_name']}")

    for b in new_buyers:
        db.collection("buyers").add(b)
        print(f"Dodat kupac: {b['display_name']}")

if __name__ == "__main__":
    add_test_data()
    print("\n--- SVI TESTNI PODACI SU USPEŠNO UPISANI U FIREBASE ---")