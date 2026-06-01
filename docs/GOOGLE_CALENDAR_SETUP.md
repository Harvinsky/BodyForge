# Google Calendar API — Nastavenie v Google Cloud Console

Tento návod ťa prevedie nastavením OAuth 2.0 credentials pre Google Calendar API, aby BodyForge dashboard zobrazoval tvoje nadchádzajúce udalosti.

## 1. Vytvor projekt v Google Cloud Console

1. Otvor [Google Cloud Console](https://console.cloud.google.com/)
2. Klikni na výber projektu (hore vľavo) → **New Project**
3. Názov: napr. `BodyForge`
4. Klikni **Create**

## 2. Povoľ Google Calendar API

1. V menu choď na **APIs & Services** → **Library**
2. Vyhľadaj **Google Calendar API**
3. Klikni **Enable**

## 3. Nastav OAuth Consent Screen

1. Choď na **APIs & Services** → **OAuth consent screen**
2. User Type: **External** (pre osobné použitie stačí)
3. Vyplň:
   - App name: `BodyForge`
   - User support email: tvoj email
   - Developer contact: tvoj email
4. Scopes: pridaj `https://www.googleapis.com/auth/calendar.readonly`
5. Test users: pridaj svoj Google účet (kým app nie je verified)
6. Ulož

## 4. Vytvor OAuth 2.0 Client ID

1. Choď na **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `BodyForge Web Client`
5. Authorized redirect URIs — pridaj:
   - `https://developers.google.com/oauthplayground` (pre získanie refresh tokenu)
6. Klikni **Create**
7. Skopíruj **Client ID** a **Client Secret** do `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

## 5. Získaj Refresh Token (OAuth Playground)

1. Otvor [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Klikni ⚙️ (Settings) vpravo hore
3. Zaškrtni **Use your own OAuth credentials**
4. Vlož svoj Client ID a Client Secret
5. V ľavom paneli nájdi **Google Calendar API v3** → zaškrtni:
   - `https://www.googleapis.com/auth/calendar.readonly`
6. Klikni **Authorize APIs** → prihlás sa svojím Google účtom
7. Klikni **Exchange authorization code for tokens**
8. Skopíruj **Refresh token** do `.env.local`:
   ```
   GOOGLE_REFRESH_TOKEN=...
   ```

## 6. Calendar ID

Pre primárny kalendár použi:
```
GOOGLE_CALENDAR_ID=primary
```

Pre konkrétny kalendár:
1. Otvor [Google Calendar](https://calendar.google.com/)
2. Nastavenia kalendára → **Integrate calendar**
3. Skopíruj **Calendar ID** (formát emailu alebo ID string)

## 7. Spusti aplikáciu

```bash
cp .env.example .env.local
# vyplň všetky hodnoty
npm run dev
```

Otvor `http://localhost:3000` — sekcia **Google Calendar** by mala zobraziť nadchádzajúce eventy.

## Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| `invalid_grant` | Refresh token expiroval — získaj nový cez OAuth Playground |
| Prázdny kalendár | Skontroluj `GOOGLE_CALENDAR_ID` a či máš nadchádzajúce udalosti |
| `access_denied` | Pridaj svoj email medzi Test users v OAuth consent screen |
| API not enabled | Povoľ Google Calendar API v Library |

## Bezpečnosť

- **Nikdy** necommituj `.env.local` do gitu
- Refresh token je citlivý — drž ho len na serveri (`.env.local` sa načítava len server-side v `/api/calendar`)
- Pre produkciu zváž Google Service Account namiesto OAuth refresh tokenu
