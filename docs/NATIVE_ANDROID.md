# BodyForge — natívna Android appka (bez Vercel)

BodyForge je **Capacitor Android APK**. Nepotrebuješ Vercel ani verejnú doménu.

## Ako to funguje

| Čo | Ako |
|----|-----|
| **UI appky** | WebView v APK — načíta Next.js z PC cez Wi‑Fi (`192.168.x.x:3000`) |
| **Dáta** | Telefón → Supabase priamo (používateľ nevidí URL v prihlásení) |
| **Google login** | **Natívny** dialóg v APK (`@codetrix-studio/capacitor-google-auth`) |
| **Kalendár** | Google token zo session, API na serveri |

Prihlásenie **neukazuje** `supabase.co` ani Vercel — len systémový Google výber účtu v telefóne.

---

## 1. Google Cloud — dva klienty

### A) Web client (pre Supabase + plugin)

1. Credentials → **Create OAuth client** → **Web application**
2. Názov: `BodyForge Web (Supabase)`
3. **Authorized redirect URIs** — **Google neakceptuje IP adresy** (`192.168.x.x`).

   Pre **mobile Chrome / LAN** redirect rieši Supabase — v Google pridaj len:

   ```
   https://TVOJ-PROJECT.supabase.co/auth/v1/callback
   ```

   Pre **localhost na PC** (voliteľný priamy OAuth):

   ```
   http://localhost:3000/api/auth/google/callback
   ```
4. Skopíruj **Client ID** → `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`
5. **Client Secret** → `GOOGLE_OAUTH_CLIENT_SECRET` (pre PC prehliadač)

### B) Android client (pre natívne prihlásenie v APK)

1. Credentials → **Create OAuth client** → **Android**
2. Package name: `com.bodyforge.app`
3. **SHA-1** debug kľúča:

```powershell
cd c:\BodyForgeApp\android
.\gradlew.bat signingReport
```

(V sekcii `Variant: debug` skopíruj SHA-1.)

4. Ulož — tento klient nemá redirect URI, funguje v APK.

### Branding

[Google Auth → Branding](https://console.cloud.google.com/auth/branding): názov **BodyForge**, logo `public/deer-logo.svg`.

---

## 2. Supabase

**Authentication → Providers → Google** — zapnuté, **rovnaký Web Client ID + Secret** ako v kroku A.

---

## 3. `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx
```

---

## 4. Build a spustenie (bežný workflow)

**Na PC:**

```powershell
cd c:\BodyForgeApp
npm run prod:mobile
```

**Sync APK (načíta .env.local + LAN IP):**

```powershell
npm run android:sync
npm run android:open
```

V Android Studio: **Run** na telefóne (USB alebo emulátor).

**Telefón a PC musia byť na rovnakej Wi‑Fi.**

---

## 5. Finálne APK (bez Android Studio)

```powershell
npm run android:apk
```

Súbor: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Čo používateľ vidí

1. Otvorí **BodyForge** (ikona v telefóne)
2. Login — logo v strede
3. **Pokračovať cez Google** → natívny Google účet (nie prehliadač, nie supabase.co)
4. Dashboard

---

## FAQ

**Potrebujem Vercel?**  
Nie. Len PC server doma (alebo neskôr bundled APK — samostatná fáza).

**Prečo ešte Wi‑Fi k PC?**  
UI beží z Next.js na PC. Dáta idú do cloudu (Supabase). Plne offline APK bez PC je väčší refactor (static bundle).

**Prehliadač na mobile cez IP?**  
Voliteľné na test. Odporúčané: **inštalovaná APK**.

---

Detail Google OAuth: `docs/GOOGLE_LOGIN_BODYFORGE.md`
