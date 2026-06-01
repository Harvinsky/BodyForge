# BodyForge — otvorenie na mobile (vývoj)

## Rýchly postup

1. Na PC spusti: `npm run dev` (alebo `npm run dev:mobile`)
2. PC a telefón musia byť na **tej istej Wi‑Fi** (nie mobilné dáta).
3. Po `npm run dev` terminál vypíše blok **„na mobile otvor“**, napr.:
   ```
   http://192.168.1.10:3000
   ```
4. Túto adresu zadaj do **Chrome/Safari na telefóne**.

**Nikdy neotváraj** `http://0.0.0.0:3000` ani `localhost` na telefóne — prehliadač ostane „načítava“ alebo „nedostupné“.

## Ak to stále nejde

### Windows Firewall

Spusti PowerShell **ako správca** v priečinku projektu:

```powershell
.\scripts\allow-mobile-dev.ps1
```

Alebo ručne: Windows Security → Firewall → Povoliť aplikáciu → **Node.js** → súkromné siete.

### Skontroluj IP

V PowerShell na PC:

```powershell
ipconfig
```

Hľadaj **IPv4** pri Wi‑Fi/Ethernet (napr. `192.168.1.10`). IP sa môže zmeniť po reštarte routera.

### Router / Wi‑Fi

- Vypni na telefóne **VPN**.
- Nepoužívaj **hosťovskú Wi‑Fi**, ak izoluje zariadenia od PC.
- iPhone: Nastavenia → Wi‑Fi → (i) → vypni **Limit IP Address Tracking** ak blokuje LAN.

### Nesprávna adresa

| Nepoužívaj | Používaj |
|------------|----------|
| `localhost:3000` | `http://192.168.x.x:3000` |
| `http://0.0.0.0:3000` | `http://192.168.x.x:3000` (IP z terminálu) |
| `https://192.168...` (pri `npm run dev`) | `http://192.168...` |
| port 3001/3002 ak beží iný server | port z terminálu (väčšinou **3000**) |

## Stále používanie „kedykoľvek“

Domáca IP funguje len keď beží PC. Na mobile bez PC nasaď **Vercel** → `https://tvoja-app.vercel.app`.

### Prvé načítanie trvá dlho

Pri `npm run dev` môže prvá stránka na mobile trvať **15–30 s** (kompilácia na PC). Nechaj ju dobehnúť alebo na PC raz otvor `http://localhost:3000`, potom na mobile obnov.
