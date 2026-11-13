# Housemaster F – housemasterf.frodewerner.no

Nettsiden for musikken til Housemaster F: egne låter, DJ-mixer, spillejobber og booking.
Designet er «Housemaster F – mørkebrun» fra Claude-utkastet.

Siden består bare av statiske filer (`public/`) uten byggetrinn. **Innholdet styres fra Herah**
(appen «Housemaster F» under Apper, `api/housemaster.ts` i `Phroden/data`):

| I Herah | På nettsiden |
| --- | --- |
| Samlingen **Egne låter** (kryss av *Publisert*; toppbildet er coveret, *Lenke* gir spiller) | Musikk |
| Samlingen **DJ-mixer** (den nyeste publiserte vises stort) | Mixer |
| Samlingen **Spillejobber** (publiserte fra i dag og framover; *Lukket* = uten billetter) | Live |
| **Låter på siden**: opptil 3 SoundCloud-lenker limt inn på siden Housemaster F (tittel og bilde hentes fra SoundCloud) | Øverst under Musikk |
| **Last opp logo** på siden Housemaster F | Menyen, Om og bunnen |
| **Tekstene** på siden Housemaster F (intro, om, sjangre, booking, e-post, lenker) | Toppen, Om, Booking, bunnen |
| Skjemaet → samlingen **Bookingforespørsler** + varsel på telefonen | Booking |

Endringer i Herah vises på nettsiden i løpet av et halvt minutt. Uten svar fra Herah viser siden
standardtekstene som står i `index.html`, og skjuler musikk og mixer.

Spillere bygges inn fra SoundCloud, Mixcloud, Spotify og YouTube (youtube-nocookie) først når noen trykker
«Spill av», så besøkende ikke sendes til andre tjenester før de velger det. Andre lenker åpnes i en ny fane.

## Slik henger det sammen

```
nettleser ──▶ Caddy (housemasterf.frodewerner.no)
                ├─ /api/housemaster*  ──▶ Herah (127.0.0.1:8080): innhold, cover, bookingskjema
                └─ alt annet          ──▶ /srv/housemasterf/public (filene her)
```

Herah svarer bare på `/api/housemaster*` på dette vertsnavnet: ingen innlogging, app, MCP eller delinger.
CSP-en (i `server/housemasterf.caddy`) tillater bare egne filer og de fire spillerne.

## Sette det opp på serveren (én gang)

1. **DNS**: A-post `housemasterf` → samme IP som `herah.frodewerner.no` (og AAAA hvis du har IPv6).
2. **Herah**: `data-update` (så Herah har Housemaster F og `HOUSEMASTER_HOST`). Åpne *Housemaster F* under Apper
   i Herah én gang, så lages samlingene.
3. **Nettsiden** (som root):
   ```bash
   git clone https://github.com/Phroden/housemasterf.git /srv/housemasterf
   bash /srv/housemasterf/server/deploy.sh
   ```
   Skriptet legger `server/housemasterf.caddy` i `/etc/caddy/sites/` (som Herahs `install.sh` tar med og aldri
   overskriver), sjekker oppsettet og laster Caddy på nytt. Caddy henter HTTPS-sertifikatet selv når DNS er klar.

## Oppdatere

```bash
bash /srv/housemasterf/server/deploy.sh
```

## Se siden lokalt

```bash
deno run --allow-net --allow-read --allow-env tools/serve.ts      # innhold fra herah.frodewerner.no
HERAH=http://localhost:8080 deno run --allow-net --allow-read --allow-env tools/serve.ts
```

Åpne http://localhost:8000. Bookingskjemaet sendes ikke videre lokalt.

## Filer

- `public/index.html`, `style.css`, `app.js` – siden (ingen inline skript eller stil, så CSP-en kan være streng)
- `public/img/` – toppbildet, logoene, delingsbildet og ikonene (fra utkastet)
- `public/fonts/` – Unbounded, Inter og JetBrains Mono, lagret her (SIL OFL 1.1, se `OFL.txt`) – ingen Google Fonts
- `server/housemasterf.caddy` – Caddy-oppsettet, `server/deploy.sh` – oppdatering
- `tools/serve.ts` – lokal forhåndsvisning

Farger og skrift justeres øverst i `public/style.css` (`--accent`, `--pink`, `--teal` …).
