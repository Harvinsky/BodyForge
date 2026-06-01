# Prihlásenie cez Google (Supabase Auth)

Aplikácia podporuje **Prihlásiť sa cez Google** na stránke `/login`.  
Používa Supabase Auth — **nie** tie isté credentials ako Google Calendar API.

## 1. Google Cloud — OAuth klient pre prihlásenie

Môžeš použiť **ten istý projekt** v Google Cloud ako pre Calendar.

1. [Google Cloud Console](https://console.cloud.google.com/) → tvoj projekt
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth client ID** → **Web application**
4. Názov: napr. `BodyForge Supabase Auth`
5. **Authorized redirect URIs** — pridaj **oboje**:

```
https://TVOJ-PROJECT-REF.supabase.co/auth/v1/callback
```

`TVOJ-PROJECT-REF` = z URL Supabase (`rxkdmkgjkvmzzxwlilyj` z `https://rxkdmkgjkvmzzxwlilyj.supabase.co`)

> **Pozor:** `http://localhost:3000/auth/callback` patrí len do **Supabase** (nie do Google redirect URIs).

6. Skopíruj **Client ID** a **Client Secret**

> Pre Calendar API môžeš mať **druhého** OAuth klienta (s redirectom na OAuth Playground). Pre prihlásenie do appky treba redirect na Supabase callback vyššie.

## 2. Supabase — zapni Google provider

1. [Supabase Dashboard](https://supabase.com/dashboard) → tvoj projekt
2. **Authentication** → **Providers** → **Google**
3. Zapni **Enable Google**
4. Vlož **Client ID** a **Client Secret** z kroku 1
5. Ulož

## 3. Supabase — URL adresy

**Authentication** → **URL Configuration**:

| Pole | Hodnota (lokálne) |
|------|-------------------|
| **Site URL** | `http://localhost:3000` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` |

Pre produkciu pridaj aj `https://tvoja-domena.sk/auth/callback`.

## 4. Test

```bash
npm run dev
```

1. Otvor `http://localhost:3000/login`
2. Klikni **Prihlásiť sa cez Google**
3. Vyber účet → mal si skončiť na dashboarde prihlásený

## Riešenie problémov

| Chyba | Riešenie |
|-------|----------|
| `redirect_uri_mismatch` | V Google Credentials musí byť presne `https://xxx.supabase.co/auth/v1/callback` |
| Návrat na `/login?error=auth` | Skontroluj Redirect URLs v Supabase a Google Client ID/Secret |
| Google nie je v Test users | Pri OAuth consent screen pridaj Gmail (External app v Testing mode) |

## Dve Google integrácie naraz

| Účel | Kde sa nastavuje |
|------|------------------|
| **Prihlásenie do appky** | Supabase → Providers → Google |
| **Čítanie kalendára** | `.env.local` → `GOOGLE_CLIENT_*` + refresh token |

Môžu byť v jednom Google Cloud projekte, ale typicky **dva OAuth klienti** (iné redirect URI).
