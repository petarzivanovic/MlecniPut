

## Plan: Omogućiti vozaču pristup pretplatama za generisanje rute

### Problem
Tabela `subscriptions` ima RLS politike samo za:
- Korisnik vidi svoje pretplate
- Dispečer vidi sve pretplate

Vozač nema SELECT pristup → query vraća `[]` → ruta nema dostave.

Isti problem postoji i za `orders` tabelu — vozač ne može da čita jednokratne narudžbine.

### Rešenje

#### Nova migracija — 2 RLS politike

```sql
-- Vozači mogu da čitaju sve aktivne pretplate
CREATE POLICY "Drivers can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'vozac'::app_role));

-- Vozači mogu da čitaju sve narudžbine
CREATE POLICY "Drivers can view all orders"
ON public.orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'vozac'::app_role));
```

#### Bez izmena koda
Kod u `DriverDashboard.tsx` već ispravno koristi `.contains("delivery_days", [selectedDayKey])` — čim RLS dozvoli čitanje, pretplate će se pojaviti u payload-u i ruta će uključiti dostave.

### Fajlovi za izmenu
- **Nova migracija**: dodavanje 2 RLS politike

