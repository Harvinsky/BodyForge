# Oprava: Unable to exchange external code

Táto chyba = **Supabase ↔ Google** — zlé **Client ID** alebo **Client Secret** v Supabase.

`4/0A...` v správe je začiatok Google kódu, nie tvoja chyba v kóde appky.

## Riešenie (5 min)

### 1. Google Cloud

1. [Credentials](https://console.cloud.google.com/apis/credentials)
2. Otvor klienta **BodyForge** (Web application)
3. Skopíruj **Client ID** (celý reťazec)
4. **Client Secret** → ak si nie si istý, klikni **Reset secret** → skopíruj **nový** secret hneď

### 2. Supabase

1. **Authentication** → **Providers** → **Google**
2. Vlož **Client ID** a **Client Secret** (nový po resete)
3. Žiadne medzery na začiatku/konci
4. **Save**

### 3. Redirect URI (Google) — skontroluj ešte raz

```
https://rxkdmkgjkvmzzxwlilyj.supabase.co/auth/v1/callback
```

### 4. Vyčisti session

- Zavri všetky taby s `localhost:3000`
- Anonymné okno (Ctrl+Shift+N)
- `npm run dev` reštart

### 5. Test

`http://localhost:3000/login` → Prihlásiť sa cez Google

## Kontrolný zoznam

- [ ] Client ID v Supabase = Client ID v Google (znak po znaku)
- [ ] Secret je z **toho istého** klienta (po resete nový v oboch miestach)
- [ ] Typ klienta = **Web application**
- [ ] Gmail je v **Test users** (OAuth consent screen)

## Stále zlyhá?

Supabase → **Authentication** → **Logs** — pozri posledný Google login a presnú chybu.
