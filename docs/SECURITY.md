# BodyForge — bezpečnosť a HTTPS

## Certifikáty (TLS)

**Vlastné certifikáty v kóde neinštaluješ.** Na produkcii ich rieši hosting:

| Prostredie | HTTPS |
|------------|--------|
| **Vercel** (odporúčané) | Automatický Let's Encrypt pre `https://tvoja-app.vercel.app` |
| **Lokálny vývoj** | `http://localhost:3000` (normálne) |
| **Lokálny HTTPS test** | `npm run dev:https` → self-signed cert (prehliadač môže varovať) |

Po deployi na Vercel máš vždy **HTTPS** — nič ďalšie nekupuješ.

## Čo appka už robí v kóde

- **HSTS** — prehliadač používa len HTTPS (produkcia)
- **Presmerovanie HTTP → HTTPS** (produkcia, cez `x-forwarded-proto`)
- **Content-Security-Policy** — obmedzenie skriptov a pripojení (Supabase)
- **X-Frame-Options**, **nosniff**, **Referrer-Policy**, **COOP/CORP**
- **Secure cookies** pre Supabase session (produkcia)
- **Kalendár API** — len pre prihláseného používateľa
- **OAuth redirect** — blokovanie open redirect (`next=`)

## Checklist pred nasadením

1. **Nikdy** necommituj `.env.local` (je v `.gitignore`).
2. V **Vercel → Environment Variables** daj rovnaké premenné ako lokálne.
3. V **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://tvoja-app.vercel.app`
   - Redirect URLs: `https://tvoja-app.vercel.app/**`
4. V **Google Cloud** OAuth redirect len Supabase callback, nie Vercel URL.
5. V Supabase zapni **RLS** na všetkých tabuľkách (SQL v `supabase/`).
6. Google **Client Secret** a **Refresh token** len na serveri (nie `NEXT_PUBLIC_`).

## Rotácia kľúčov

Ak unikli kľúče z `.env.local`:

1. Supabase → reset **anon** key (ak treba).
2. Google Cloud → nový **Client Secret**, nový **refresh token**.
3. Vercel → aktualizuj env a **Redeploy**.

## Limity

- Bez vlastného servera závisíš na **Supabase + Vercel** (ich certifikáty a infra).
- Plný **offline režim** nie je súčasťou bezpečnostného balíka.
- **WAF / DDoS** rieši Vercel na vyšších plánoch; free tier má základnú ochranu.
