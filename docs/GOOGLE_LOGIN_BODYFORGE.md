# Google prihlásenie — BodyForge

## Android APK (odporúčané — bez domén)

V **natívnej appke** sa používa systémový Google dialóg.  
**Nepotrebuješ** Vercel, redirect URI ani `supabase.co` v Google okne.

→ Postup: **`docs/NATIVE_ANDROID.md`**

---

## PC prehliadač (dev / test)

### Localhost (priamy OAuth — voliteľné)

Google **nepovoľuje** redirect URI s IP (`192.168.x.x`). Povolené je len **`localhost`**.

Pre PC na `http://localhost:3000` môžeš pridať do **Web client → Authorized redirect URIs**:

```
http://localhost:3000/api/auth/google/callback
```

### Mobile Chrome / LAN IP (`192.168.x.x`)

Tu **nepridávaj** redirect do Google — Google to odmietne.

Appka automaticky použije **Supabase OAuth** (redirect cez `https://xxx.supabase.co`).

1. **Google Cloud** → Web client → redirect URI **iba**:

```
https://TVOJ-PROJECT.supabase.co/auth/v1/callback
```

2. **Supabase** → Authentication → URL Configuration → **Redirect URLs** pridaj:

```
http://192.168.1.10:3000/auth/callback
http://localhost:3000/auth/callback
```

(Vymeň IP za tú z `npm run start:mobile`.)

```env
GOOGLE_OAUTH_CLIENT_ID=...   # rovnaké ako NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

Supabase → Google provider: rovnaký Client ID + Secret.

---

## Google Cloud checklist

- [ ] **Web client** → Web Client ID + Secret (Supabase)
- [ ] **Android client** → package `com.bodyforge.app` + SHA-1
- [ ] **Branding** → názov BodyForge + logo
- [ ] Supabase Google provider zapnutý

---

## Riešenie problémov

| Problém | Riešenie |
|---------|----------|
| Google: „Must end with public top-level domain“ | **Nepridávaj** `192.168.x.x` do Google — len Supabase callback + localhost |
| `invalid_request` / Authorization error na mobile | Supabase Redirect URLs musí mať `http://192.168.x.x:3000/auth/callback` |
| `DEVELOPER_ERROR` v APK | Zlý SHA-1 alebo package v Android OAuth client |
| `signInWithIdToken` error | Supabase Google = rovnaký Web Client ID |
| Appka prázdna | PC musí bežať `npm run prod:mobile`, rovnaká Wi‑Fi |
| Kalendár prázdny | Znova prihlásiť Google (scope calendar) |
