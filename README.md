# Presetka – generátor sportovních grafik

Webová aplikace pro rychlou tvorbu grafik na Instagram, Facebook a X ze šablon a dat.
Vyberete šablonu, vyplníte data (ručně, CSV, JSON, URL, API) a aplikace sama rozloží
grafiku do všech formátů a vyexportuje PNG/JPG/ZIP v plném rozlišení. Funguje na mobilu.

```
DATA  →  TEMPLATE  →  RENDERER  →  EXPORT
```

## Co umí

- **Projekty** (např. Obasketu.cz → NBL, NBA, ŽBL, Reprezentace) – každý má vlastní šablony, brand kit, týmy, data a grafiky
- **Brand kit** – loga, 6 barev, 3 fonty (Google Fonts s češtinou nebo vlastní TTF/OTF/WOFF), pozadí, grafické prvky, **zámky** pro editory
- **16 demo šablon**: výsledek, pozvánka, zápasový den, sestava, přestup, nový hráč, statistiky hráče, tabulka, konečné pořadí, jubileum, citát, breaking news, carousel výsledků, story, reels cover, program kola
- **Import z Affinity (SVG) a PSD** – hotovou grafiku převede na šablonu (Affinity: Soubor → Exportovat → SVG, text nepřevádět na křivky): vrstvy na stejných místech, texty jako pole formuláře, fotka jako pole pro fotku
- **Vlastní obrázky ve šabloně** – čáry, pozadí řádků, textury: *Editor → Vlastní obrázek* nebo u prvku *Nahrát obrázek*; libovolnou vrstvu lze přepnout na „fotku“ nebo „logo týmu“; **přechod do průhledna** (maska) pro fotky a pozadí
- **Editor šablon** – vrstvy, datová pole, vlastnosti, tažení a změna velikosti, přichytávání na střed, undo/redo, kotvení pro formáty, úpravy jen pro konkrétní formát
- **Automatické rozvržení** – text se zmenší, aby se vešel (nikdy nepřeteče), týmy se poznají podle názvu/zkratky/aliasu a načtou logo i barvy, seznamy řádků se samy zmenší/rozprostřou
- **5 formátů** – 1080×1350, 1080×1080, 1080×1920, 1200×1500, 1600×900. Na šířku se fotka přesune doleva a obsah doprava (skutečné přeskupení, ne zmenšení)
- **Fotky** – nahrání, zoom, posun výřezu tažením v náhledu, **odstranění pozadí** (AI v prohlížeči zdarma, nebo remove.bg)
- **Hromadné generování** z CSV (mapování sloupců, fotky podle názvu souboru) → ZIP
- **Carousel** – libovolný počet zápasů se automaticky rozdělí na slidy
- **Vyplnění ze screenshotu** – Ctrl+V / fotka screenshotu z Livesportu či Flashscore → AI vyplní týmy, skóre, časy, program i hráče zápasu (potřebuje `ANTHROPIC_API_KEY`)
- **AI asistent** – z věty „Nymburk porazil Brno 92:78…“ navrhne titulky, teaser, text příspěvku a vyplní pole. Design nemění.
- **Role** Administrátor / Editor / Pouze prohlížení
- **Export** PNG, JPG, 1× nebo 2×, všechny formáty do ZIP, na mobilu „Sdílet → Uložit obrázek“

## Nasazení na Vercel (5 minut)

1. Nahrajte složku na GitHub (nový repozitář → „uploading an existing file“, nebo `git push`).
2. Na [vercel.com/new](https://vercel.com/new) zvolte repozitář → **Deploy**. Nic dalšího nastavovat není třeba.
3. Volitelně v *Settings → Environment Variables* doplňte:
   - `ANTHROPIC_API_KEY` – zapne AI asistenta
   - `REMOVE_BG_API_KEY` – odstranění pozadí přes remove.bg (jinak běží zdarma v prohlížeči)
4. Na iPhonu otevřete adresu v Safari → Sdílet → **Přidat na plochu**. Aplikace se pak spouští jako appka.

Lokálně:

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # produkční build
```

## Synchronizace PC ↔ mobil (doporučeno)

1. Ve Vercelu otevřete projekt → záložka **Storage** → **Create** → **Blob** → připojit k projektu (přidá `BLOB_READ_WRITE_TOKEN`).
2. **Settings → Environment Variables** → přidat `APP_PASSWORD` = vaše heslo.
3. **Deployments → Redeploy**.
4. V aplikaci **Nastavení → Synchronizace mezi zařízeními** zadat heslo a Zapnout – **nejdřív na počítači**, pak na mobilu.

Změny se ukládají do cloudu automaticky po pár sekundách a načítají se při otevření aplikace.
Při souběžné úpravě stejné šablony na dvou zařízeních vyhrává novější úprava.
Pokud Blob úložiště vytvoříte jako soukromé (private), přidejte ještě `BLOB_ACCESS=private`.

## Kde jsou data

MVP je **local-first**: projekty, šablony, fotky a grafiky se ukládají v prohlížeči (IndexedDB),
takže aplikace nepotřebuje databázi ani přihlášení. Přenos mezi zařízeními: *Projekty → Záloha*
(JSON) a na druhém zařízení *Obnovit zálohu*.

Přechod na cloud (Supabase): úložiště je za rozhraním `StorageAdapter` v `src/lib/storage.ts`.
Stačí dopsat `SupabaseAdapter` se stejnými metodami; návrh schématu je v `docs/schema.prisma.example`.
Role jsou v `src/lib/permissions.ts` a po napojení Supabase Auth se převezmou z tabulky `Membership`.

## Struktura

```
app/                     Next.js (stránka + API routy)
  api/ai                 AI asistent (Anthropic)
  api/remove-bg          proxy na remove.bg
  api/proxy              načtení CSV/JSON z URL bez CORS
  api/sports/[resource]  ukázkové sportovní API (matches, results, teams, players, standings, competitions)
src/lib/
  types.ts               datový model (šablona, prvek, pole, brand kit, grafika…)
  layout.ts              přepočet rozložení mezi formáty (kotvy, zóny, seznamy)
  render.ts              canvas renderer (auto-fit textu, loga, fotky, přechody)
  template-string.ts     {{pole|filtr}} – upper, lower, short, day, date, date:short
  data-import.ts         CSV/JSON/text parsování, mapování sloupců
  data-sources.ts        SportsDataProvider (demo + REST)
  bg-removal.ts          BackgroundRemover (prohlížeč / remove.bg)
  ai.ts                  AI provider
  export.ts              PNG/JPG/ZIP, sdílení
  demo/                  demo šablony, týmy a data
src/views/               obrazovky (dashboard, tvorba, editor, brand kit, data, hromadně…)
artifact/                build samostatné verze bez serveru (node artifact/build.mjs)
```

## Jak funguje šablona

Každý prvek má rám v základním formátu a pravidla:

- **Vodorovně / svisle**: vlevo, na střed, vpravo, nahoru, dolů, roztáhnout, poměrně (jako constraints ve Figmě)
- **Zóna** pro formát 16:9: *hlavní fotka* jde doleva, *obsah* doprava, *pozadí* přes vše
- **Ruční úprava pro formát** – v editoru přepnete formát a posunete prvek; uloží se jen pro něj

Texty: `{{home_team|short}} {{home_score}} : {{away_score}}`, `[slova v hranatých závorkách]` se zvýrazní.
Barvy: `@primary`, `@accent/60` (60 % krytí), `@team:{{home_team}}` (barva týmu).
Loga týmů: zdroj `team:{{home_team}}`, logo projektu `brand:logo`.

## Poznámky

- Demo výsledky, statistiky a hráči jsou vymyšlené. Loga týmů se zobrazují jako monogramy, dokud nenahrajete skutečná loga (Datové zdroje → Týmy).
- Demo fotky (hala, míč, silueta hráče) jsou kreslené kódem – nahraďte je vlastními.
