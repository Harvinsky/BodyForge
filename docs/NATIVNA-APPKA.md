# BodyForge — natívna appka na telefón (bez Vercelu)

BodyForge už má **Android projekt** (Capacitor). Na telefóne to nie je „web v Chrome“, ale **nainštalovaná ikona BodyForge**.

## Fáza 1 — vyladiť funkčnosť (teraz, bez APK)

Kým všetko nefunguje, **negeneruj finálne APK**. Testuj takto:

| Spôsob | Kedy |
|--------|------|
| **Chrome na mobile** (`http://192.168.x.x:3000`) | Najrýchlejší test UI + login |
| **Android Studio → Run** ▶ | Test natívnej appky (notifikácie, ikona) bez `assembleRelease` |

APK súbor (`npm run android:apk`) nechaj na **Fázu 2**, až keď budeš spokojný.

## Ako to funguje (bez Vercelu)

```
[ Ikona BodyForge na Androidi ]
         ↓
    Natívny WebView (Capacitor)
         ↓
    Tvoj PC v domácej Wi‑Fi: http://192.168.x.x:3000
         ↓
    Supabase (dáta + prihlásenie Google) — cloud, to je OK
```

- **Vercel nepotrebuješ.**
- **PC** musí bežať server, keď appku používaš doma (alebo neskôr vlastný server / Raspberry Pi).
- **Telefón a PC** musia byť na **rovnakej Wi‑Fi**.

---

## Čo potrebuješ (jednorazovo)

1. **Node.js** na PC (už máš)
2. **Android Studio** — [stiahnuť](https://developer.android.com/studio)
3. Telefón: **Vývojár** → **USB ladenie** zapnuté (alebo emulátor v Android Studio)

---

## Krok 1 — Spusti server na PC

V `c:\BodyForgeApp`:

```powershell
npm run build
npm run start:mobile
```

Nechaj okno otvorené. Výpis ukáže napr. `http://192.168.1.10:3000` — túto IP si zapamätaj.

---

## Krok 2 — Zbuilduj / syncni Android appku

Nové okno PowerShell:

```powershell
cd c:\BodyForgeApp
npm run android:sync
```

Skript nastaví v APK adresu tvojho PC v sieti (nie Vercel).

---

## Krok 3 — Test na telefóne (bez APK)

### A) Len overenie v Chrome (odporúčané na začiatok)

Na mobile v Chrome otvor `http://192.168.1.10:3000/login` (tvoja IP z kroku 1).

Ak tu všetko funguje (login, dáta, layout), natívna appka bude rovnaká.

### B) Natívna appka cez Android Studio (stále nie finálne APK)

```powershell
npm run android:open
```

- Gradle sync → pripoj telefón (USB debugging) alebo emulátor
- **Run** ▶ (debug inštalácia — na ladenie, nie finálny release)

Po každej zmene v kóde:

```powershell
npm run build
# reštartuj start:mobile ak beží
npm run android:sync
# v Android Studio znova Run
```

---

## Fáza 2 — finálne APK (až neskôr)

Keď si overíš, že login, dáta, tréning a layout sú OK:

```powershell
npm run android:apk
```

APK: `android\app\build\outputs\apk\debug\app-debug.apk`  
(Na Google Play neskôr: **Signed Release** v Android Studio.)

---

## Krok 4 — Supabase (prihlásenie)

V Supabase → **Authentication** → **URL Configuration** pridaj (svoju IP z kroku 1):

| Pole | Hodnota |
|------|---------|
| Site URL | `http://192.168.1.10:3000` |
| Redirect URLs | `http://192.168.1.10:3000/auth/callback` |

Google OAuth redirect v Google Cloud ostáva: `https://TVOJ-PROJECT.supabase.co/auth/v1/callback`

---

## Denné používanie

1. Na PC: `npm run start:mobile`
2. Na mobile: otvor appku **BodyForge**
3. Prihlás sa cez Google (Chrome/WebView v appke)

Ak appka neukáže obsah → skontroluj rovnakú Wi‑Fi a firewall port **3000**.

---

## Zmena IP (po reštarte routera)

```powershell
npm run android:sync
npm run android:apk
```

Znova nainštaluj APK (alebo Run z Android Studio).

---

## iOS (iPhone)

Potrebuješ Mac + Xcode:

```bash
npx cap add ios
CAPACITOR_SERVER_URL=http://192.168.1.10:3000 npm run cap:sync
npx cap open ios
```

---

## Čo to znamená

| Áno | Nie |
|-----|-----|
| Nainštalovaná ikona na ploche | Nie je to Expo Go |
| Notifikácie v natívnej appke | Nie funguje offline bez servera |
| Rovnaký dashboard ako na PC | Nie je 100 % „natívny“ Swift/Kotlin UI — je to tvoj web v shelli |

Ak chceš appku **úplne bez PC** (vždy a všade), treba buď vlastný server (VPS, domáci NAS) s HTTPS, alebo väčší refactor na offline build — to je iná fáza.
