# BodyForge

Osobný fitness a life-optimization dashboard (**BodyForge**) postavený na **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS** a **shadcn/ui**.

## Štýl

**Industrial Renaissance** — tmavá monochromatická téma, vysoký kontrast, ostré hrany, jemná textúra pozadia.

## Moduly

| Modul | Popis |
|-------|-------|
| **Daily Tracker** | Checkbox systém: jedálne okno, hydratácia 3,5 L, tréning dnes |
| **Google Calendar** | Nadchádzajúce eventy, busy bloky, hint na jedlo |
| **Progress Chart** | 7-dňový graf konzistencie (% splnených úloh) |
| **Notifikácie** | Web Notification API: 12:00, 18:30, 19:00 |

## Štruktúra projektu

```
src/
├── app/
│   ├── api/calendar/route.ts      # Google Calendar API proxy
│   ├── auth/callback/route.ts     # Supabase OAuth callback
│   ├── login/page.tsx             # Prihlásenie / registrácia
│   ├── layout.tsx
│   ├── page.tsx                   # Hlavný dashboard
│   └── globals.css                # Industrial Renaissance theme
├── components/
│   ├── ui/                        # shadcn/ui komponenty
│   └── dashboard/                 # Dashboard moduly
├── hooks/
│   ├── use-calendar.ts
│   ├── use-daily-tracker.tsx
│   └── use-notifications.ts
├── lib/
│   ├── supabase/                  # Supabase client, server, middleware
│   ├── google-calendar.ts
│   ├── notifications.ts
│   └── types.ts
└── middleware.ts
supabase/schema.sql                # DB schéma pre Supabase
docs/GOOGLE_CALENDAR_SETUP.md      # Google Cloud inštrukcie
.env.example
```

## Rýchly štart

### 1. Inštalácia

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Vytvor projekt na [supabase.com](https://supabase.com)
2. Skopíruj **Project URL** a **anon key** do `.env.local`
3. V SQL Editori spusti `supabase/schema.sql`
4. V Authentication → Providers povoľ **Email** a/alebo **Google** — návod: [docs/SUPABASE_GOOGLE_AUTH.md](docs/SUPABASE_GOOGLE_AUTH.md)

### 3. Google Calendar

Postupuj podľa [docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md)

### 4. Spustenie

```bash
npm run dev
```

Otvor [http://localhost:3000](http://localhost:3000)

> Dashboard funguje aj bez prihlásenia (localStorage). Po prihlásení sa dáta synchronizujú cez Supabase.

## Tech stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui
- Supabase (auth + daily_logs)
- Google Calendar API (googleapis)
- Recharts · Lucide React · date-fns
