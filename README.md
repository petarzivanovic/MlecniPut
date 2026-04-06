# 🥛 Mlečni Put

**AI platforma za optimizaciju lanca snabdevanja mlečnih proizvoda u Srbiji.**

Projekat razvijen na FON Hakatonu — povezuje lokalne mlekare, vozače i kupce kroz pametnu logistiku i predikciju potražnje.

---

## 🧩 Arhitektura

```
MlecniPut/
├── main.py              # FastAPI backend (AI rute + predikcije)
├── requirements.txt     # Python zavisnosti
├── .env                 # API ključevi (nije na Git-u)
└── frontend/            # React + Vite frontend (Lovable)
    ├── src/
    │   ├── pages/       # Stranice (Dashboard, Vozač, Mlekar...)
    │   └── components/  # UI komponente
    ├── package.json
    └── vite.config.ts
```

## ⚙️ Tehnologije

### Backend
- **FastAPI** — REST API
- **OpenAI GPT-4o** — AI generisanje ruta i predikcija potražnje
- **Prophet** — vremenska analiza podataka
- **OR-Tools** — optimizacija ruta
- **Supabase** — baza podataka

### Frontend
- **React + TypeScript** — UI
- **Vite** — build tool
- **Tailwind CSS + shadcn/ui** — dizajn
- **Framer Motion** — animacije
- **Supabase** — autentifikacija i real-time podaci

## 🚀 Pokretanje

### Backend
```bash
cd MlecniPut
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment varijable

Kreiraj `.env` fajl u root-u:
```
OPENAI_API_KEY=tvoj_kljuc
```

## 📡 API Endpointi

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/generate-route` | AI generiše optimalnu dnevnu rutu za vozača |
| POST | `/api/predict-demand` | AI predviđa potražnju za sledeću nedelju |

## 👥 Tim

Projekat rađen u okviru **FON Hakatona 2026**.