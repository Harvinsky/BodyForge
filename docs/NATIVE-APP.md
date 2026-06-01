# BodyForge — natívna appka (Android / iOS)

Appka je **Capacitor shell** okolo toho istého Next.js webu — nemusíš písať všetko znova v React Native.

## Ako to funguje

```
[ Ikona BodyForge na telefóne ]
         ↓
   Capacitor WebView
         ↓
   https://tvoja-app.vercel.app  (alebo dev server v LAN)
         ↓
   Supabase + API + kalendár (ako na webe)
```

## Predpoklady

1. **Nasadený web na Vercel** (HTTPS) — odporúčané pre ostrú appku  
   alebo lokálny `npm run dev` + IP v sieti (len na testovanie).
2. **Android Studio** (Windows) — na build APK / emulátor.
3. **Mac + Xcode** — len pre iOS (voliteľné).

## Kroky — Android (Windows)

### 1. Vercel URL do Capacitor

V PowerShell v `c:\T-800App`:

```powershell
$env:CAPACITOR_SERVER_URL = "https://TVOJA-APP.vercel.app"
npm run cap:sync
```

V `.env.local` môžeš mať aj (pre budúce skripty):

```
NEXT_PUBLIC_APP_URL=https://TVOJA-APP.vercel.app
```

### 2. Supabase redirect

V Supabase → Authentication → URL Configuration pridaj:

- Site URL: `https://TVOJA-APP.vercel.app`
- Redirect: `https://TVOJA-APP.vercel.app/**`

### 3. Otvor Android Studio

```powershell
npm run cap:open:android
```

- Počkaj na Gradle sync.
- Pripoj telefón (USB debugging) alebo spusti emulátor.
- **Run** (zelený trojuholník).

### 4. Pripomienky v appke

Po zapnutí **Pripomienky** v dashboarde sa v natívnej appke naplánujú **systémové notifikácie** (aj keď appku zavrieš).

## Lokálny vývoj (test na telefóne)

```powershell
npm run dev
# Skopíruj IP z výpisu, napr. http://192.168.1.10:3000

$env:CAPACITOR_SERVER_URL = "http://192.168.1.10:3000"
npm run cap:sync
npm run cap:open:android
```

Telefón musí byť v **tej istej Wi‑Fi**. HTTP vyžaduje `cleartext` (v `capacitor.config.ts` už zapnuté pre `http://`).

## iOS (Mac)

```bash
npx cap add ios
export CAPACITOR_SERVER_URL=https://TVOJA-APP.vercel.app
npm run cap:sync
npx cap open ios
```

## Google Play / App Store

1. V Android Studio: **Build → Generate Signed Bundle / APK**.
2. Účet vývojára (Google Play jednorazovo ~25 USD, Apple 99 USD/rok).
3. Ikony a screenshots — doplniť v `android/app/src/main/res`.

## Čo to nie je

- **Expo Go** — toto je samostatná inštalovaná appka BodyForge.
- **Offline-first** — bez internetu nefunguje (načítava web z Vercel).
- **Úplne natívny UI** — vzhľad je tvoj web v plnej obrazovke.

## Riešenie problémov

| Problém | Riešenie |
|--------|----------|
| Biela obrazovka | Skontroluj `CAPACITOR_SERVER_URL`, Vercel musí bežať |
| Prihlásenie Google | Redirect len na HTTPS Vercel URL |
| Notifikácie | Povoliť v Android nastaveniach pre BodyForge |
| HTTP na mobile | Použiť HTTPS (Vercel) v produkcii |
