# Mlečni Put - Pametna Logistika Distribucije Mleka

## 📋 Opis Projekta
**Mlečni Put** je inovativni sistem za optimizaciju ruta dostave mleka, dizajniran za hakaton. Koristi Firebase bazu podataka za skladištenje narudžbina i farmera, te Google Gemini AI za generisanje najprofitabilnijih ruta. Sistem pomaže malim farmerima da prodaju mleko balansirajući isporuke, dok obezbeđuje efikasnu dostavu kupcima.

### Ključne Karakteristike
- **Filtriranje po gradovima**: Automatsko grupisanje narudžbina i farmera za Beograd, Niš i Novi Sad (radius 92km).
- **AI-optimizovane rute**: Gemini AI računa profit, balansira prodavače i minimizuje troškove.
- **Real-time update-ovi**: Status narudžbina se menja na "assigned", a zalihe mleka se oduzimaju od farmera.
- **Sigurnost**: API ključevi u .env fajlu, ignorisani u Git-u.

## 🛠 Tehnologije
- **Backend**: Python 3.13
- **Baza**: Firebase Firestore
- **AI**: Google Gemini 1.5 Flash
- **Biblioteke**: `firebase-admin`, `google-generativeai`, `python-dotenv`, `geopy`
- **Frontend**: Google AI Studio (povezano sa Firebase)

## 🚀 Instalacija i Podešavanje

### 1. Kloniraj Repozitorijum
```bash
git clone [repo URL]
cd MlecniPut
```

### 2. Kreiraj Virtual Environment
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# ili source .venv/bin/activate  # Linux/Mac
```

### 3. Instaliraj Zavisnosti
```bash
pip install firebase-admin google-generativeai python-dotenv geopy
```

### 4. Podešavanje API Ključeva
- Kreiraj `.env` fajl u root folderu:
  ```
  GEMINI_API_KEY=your_gemini_api_key_here
  ```
  (Možeš dodati više ključeva odvojene zarezom za rotaciju ako se kvota potroši.)
- Kopiraj `serviceAccountKey.json` (iz Firebase konzole) u `data/` folder.

### 5. Firebase Setup
- Kreiraj Firebase projekat na [console.firebase.google.com](https://console.firebase.google.com).
- Omogući Firestore bazu.
- Dodaj kolekcije: `orders`, `sellers`, `routes`.

## 🎯 Pokretanje

### Dodavanje Test Podataka
```bash
python src/db_seeder.py
```
Ovo dodaje fake farmere, kupce i narudžbine za današnji datum.

### Pokretanje Sistema
```bash
python src/main.py
```
Sistem će:
- Učitati današnje narudžbine.
- Generisati AI rute po gradovima.
- Snimiti rute u Firebase.
- Update-ovati status narudžbina i zalihe mleka.

### Demo Output
```
--- USPEŠNO POVEZANO SA MLEKOPUT BAZOM ---
Danas u Beogradu imamo 2 narudžbina.

 Generišem rutu za BELGRADE...
 Ruta za BELGRADE spremna!
Ruta za BELGRADE uspesno sacuvana u Firebase!
🚜 Farmer [Ime]: Oduzimam 100L
🚛 Kupac [Ime]: Isporučeno 80L
```

## 📁 Struktura Projekta
```
MlecniPut/
├── data/
│   └── serviceAccountKey.json  # Firebase credentials
├── src/
│   ├── main.py                 # Ulazna tačka
│   ├── logic.py                # Filtriranje i ruta
│   ├── ai_engine.py            # AI generisanje ruta
│   ├── db_manager.py           # Firebase operacije
│   └── db_seeder.py            # Test podaci
├── .env                        # API ključevi (ignorisan)
├── .gitignore                  # Ignoriše .env, data/*.json
└── README.md                   # Ovaj fajl
```

## 🔧 Konfiguracija
- **Gradovi**: Definisan u `main.py` sa koordinatama.
- **Kapacitet kamiona**: 500L (u `ai_engine.py`).
- **Cene**: Nabavna 80 RSD/L, Prodajna 180 RSD/L, PDV 10%, Gorivo 35 RSD/km.
- **Minimum profit**: 1500 RSD po ruti.

## 🐛 Troubleshooting
- **Greška sa API ključem**: Proveri `.env` fajl i da li je ključ validan.
- **Firebase 404**: Proveri da li dokumenti postoje u bazi.
- **AI ne vraća JSON**: Prompt je podešen, ali Gemini može varirati — dodaj retry u kodu.
- **Nema podataka za grad**: Dodaj više test orders u `db_seeder.py`.

## 📞 Kontakt
- **Autor**: Miloš Kostić
- **Email**: milos.kostic.programiranje@gmail.com
- **Hakaton**: Spremno za prezentaciju i demo!

---

*Projekat je razvijen za hakaton sa fokusom na održivu poljoprivredu i efikasnu logistiku.*