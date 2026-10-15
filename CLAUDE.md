# Presetka – předávací poznámky pro Clauda

Tento soubor čte Claude na začátku každé nové konverzace nad repozitářem. Shrnuje, co bylo domluveno s Petrem
(oBasketu.cz, sportovní novinář) během dlouhého vývoje. **Komunikuj česky, stručně a upřímně.**

## O uživateli a jak s ním pracovat
- Petr dělá basketbalový obsah pro Instagram oBasketu: projekty **NBL** (Maxa NBL, muži), **ŽBL** (Chance ŽBL, ženy),
  **BCL** (Liga mistrů – Slavia, Pardubice), **Reprezentace**.
- Chce grafiky na úrovni Euroligy / NBA / BCL – **„premium“**. Ostře kritizuje cokoli, co vypadá levně („cheap“,
  „jak z první třídy“, „pozvánka na DJ akci“). Nelži mu, že se něco povedlo – vždy si výsledek vyrenderuj a podívej se.
- Funguje nejlépe: **vybrat JEDNU konkrétní předlohu a věrně ji dodělat v jeho barvách** (ne míchat 9 předloh).
  Kopírovat styl ano, ale **barvy vždy z brand kitu projektu** (nikdy barvy předlohy).
- Nechce: velké generické nadpisy typu „ŠLÁGR KOLA“ přes grafiku, ploché lineární přechody jako pozadí, příliš
  pestré/strakaté pozadí (víc barev najednou), věci které nesedí na střed (skupiny log centrovat jako celek).
- Po každé změně: `tsc`, `next build`, vyrenderovat náhled (Playwright) a ukázat obrázek. Přiznat, co nebylo ověřeno
  (např. čtení screenshotů přes AI se v sandboxu otestovat nedá).
- Bezpečnost: **API klíč Anthropic nikdy do kódu ani na GitHub** – je jen ve Vercel env `ANTHROPIC_API_KEY`.

## Stack a nasazení
- Next.js 15, React 19, TypeScript, Tailwind. Nasazeno na **Vercelu** (editor-omega-jet.vercel.app) z repa
  `petrkrenek12-beep/editor` (větev main → automatický deploy).
- Druhá varianta: Claude artefakt (`artifact/build.mjs` → `artifact/dist/index.html` + `app.js`), tam AI běží přes
  `window.claude` sample, ne přes API klíč.
- AI endpoint `app/api/ai/route.ts` – model **napevno `claude-sonnet-5-5`** (ne env proměnná; Petr to tak chce).

## Architektura (hlavní soubory)
- `src/lib/render.ts` – canvas 2D renderer všech prvků (text s auto-fit, obrázky, loga, seznamy, efekty).
- `src/lib/demo/templates.ts` – vestavěné šablony (`buildTemplates`), helpery `img/rect/text/logo/path/list/lin/brandLogo`.
- `src/lib/demo/seed.ts` – `SEED_VERSION` (zvyšovat při každé změně vestavěných šablon!), `builtInTemplates`,
  `ZBL_IDS` (které šablony má ŽBL), `zblTemplates` (feminizace textů + ukázková data ŽBL), `NBL_REMOVED`.
- `src/lib/store.ts` – IndexedDB + migrace (`initStore`), náhrobky (tombstones) pro smazané šablony.
- `src/lib/ai.ts` – čtení screenshotů (Livesport, FIBA LiveStats, cbf tabulky), MVP, čtvrtiny, tabulky.
- `src/lib/adjust.ts` – úpravy fotek (Match Color v OkLab, světlo, rim, presety).
- `src/lib/demo/textures.ts` – procedurální textury (hedvábné světlo, oblouky, rastr) – používají se s
  `lumaKey` + `tint` + `blend: "screen"`.

## Užitečné schopnosti rendereru (už existují)
- Text: `fitWith` (dvě skóre stejně velká), `fill` přechodem (kovový nadpis), `pill`, `highlight`, `vertical`, `ticker`.
- Obrázek: `useCutout` / `preferCutout` / `onlyUncut` (vyříznutý vs. nevyříznutý hráč), `feather`, `blur`, `clip`,
  `lumaKey`, `tint`, `blend`, `equalize` (stejná optická velikost log), `row` (skupina log centrovaná jako celek),
  `override` (vlastní logo).
- Podmínky `showIf`/`hideIf`: `a < b`, `==`, `*=` (obsahuje), `||`, `&&`, `photo.cut` (vlastnost obrázku).
- Seznam: `rowsBg` (i `canvas: true` + `blur` = matné sklo z pozadí), `distribute`, `center`, `grid`;
  `paginate.rowAsData` = carousel (1 řádek = 1 slide).
- `finish: { grain, vignette }` – zrno a viněta.
- Seznam v podmínkách a textech: `games.length` (počet řádků, např. `showIf: "games.length == 1"`),
  `games.0.home` (sloupec prvního řádku – i pro loga `team:{{games.0.home}}` a `channel:{{games.0.tv}}`).
- Textura `tex-vortex` (světelný vír podle EuroLeague Rivalry) – 3 vrstvy: tint `@primary` + `lumaKey`, bílé jádro
  (vyšší `lumaKey`), rozmazaná záře; vše `blend: "screen"`. Helpery `bclVortexBg()` a `bclHeader()` v templates.ts.

## Prémiové šablony (NBL + ŽBL)
- Program kola – Premium, Výsledek zápasu – Premium (+ Premium carousel), Šlágr kola – Premium,
  Hráč zápasu – Detail (podle Euroligy Lessort), Hráč zápasu – Celá postava (podle BCL Keene),
  Výsledky kola – Premium, Tabulka – Premium (bez „next game“, se sloupcem Z, šipky posunu, série).
- BCL má vlastní šablony `bcl-*` (fonty Russo One / Saira Condensed). Předloha: **EuroLeague „Rivalry Series“**
  (Partizan – Panathinaikos) převedená do barev BCL: světelný vír, kovový nadpis Russo One, stříbrný pruh s podtitulkem,
  čas v rohových závorkách.
  - `bcl-program` – 1 zápas = rozložení jako předloha (2 hráči, příjmení nahoře, loga pod hráči, čas/datum/město
    v závorkách, zkratky „SLA vs PAR“, „Živě na“ + TV); 2+ zápasy = skleněné karty mezi hráči.
  - `bcl-mvp` – Hráč zápasu BCL: vyříznutý hráč uprostřed (nevyříznutá fotka jde přes pozadí), kovové příjmení,
    3 (nebo 2) čísla v závorkách, výsledek s logy.

## Projekt „Evropské poháry“ (id `p-bcl`, dříve BCL)
- Liga mistrů FIBA (barvy projektu) + Euroliga žen a EuroCup žen. Ženské týmy (loga z ŽBL) jsou v projektu jako `p-bcl-zteam-*`.
- Šablona může mít vlastní barvy `palette` (přepíší brand kit) – tak jsou udělané `bcl-result-elw/ecw` a `bcl-mvp-elw/ecw`
  (kopie BCL šablon, feminizované, logo soutěže `asset:comp-elw` / `asset:comp-ecw`).
  Euroliga žen: tmavě modrá + světle modrá, stříbrné logo. EuroCup žen: fialová + akvamarínová, korálový míč.
- `bcl-week` – Program týdne všech českých týmů v Evropě: podle UEFA Europa League „Fixtures“ (plocha `@accent` se
  šikmými pruhy `tex-stripes`, svislý nadpis Mazzard H, tmavý panel). Seznam má `groupBy: "comp"` → před každou
  soutěží se vloží řádek nadpisu (`__header`) s logem soutěže (jako grafika Basket Ženy).
- Smazané (na přání): obecné `p-bcl-program`, `p-bcl-result`; v ŽBL player-stats, program, result, results-carousel,
  results-round, standings (náhrobky v migraci v50).

## Čtení screenshotů (AI)
- Popisky statistik vždy zkratky PTS/REB/AST/STL/BLK/EFF – v promptu i v kódu (`statLabel`, `statText` v ai.ts),
  i v řádcích carouselu (`mvp_name`, `s1_value`…). Hráč zápasu přes `_mvp`, plní i `team_score`/`opponent_score`.
- Náhledové (preview) nasazení na Vercelu NEMÁ `ANTHROPIC_API_KEY` (je jen pro Production) → AI tam hlásí chybu.

## Editor fotek (`src/lib/adjust.ts` + `AdjustPanel.tsx`)
- Inspirace imageflow.dev / Lightroom. Sekce: Tón (expozice, kontrast, světla, stíny, bílé, černé), Barvy (vibrance,
  sytost, teplota, odstín), Detail (clarity, doostření), Match Color, Barevné tónování (split toning stíny/světla +
  vyvážení, tónování hlubokých stínů), Efekty (záře/bloom, matnost, viněta, černobílé), světlo z boku, rim light.
- Tlačítka: **Před / po** (podržet), **Zrcadlit** (`flip`), **Kopírovat / Vložit** úpravy mezi fotkami (localStorage).
- Předvolby z barev brand kitu: Do barev grafiky, Dramatické, Euroliga (filmové), Noir, Matný film, Svítivé, Teplé světlo.
- Pomocné komponenty panelu musí být mimo `AdjustPanel` (jinak se posuvník při tažení přemontuje).

## Testování náhledů
- Bundle esbuild + Playwright (Chromium je v `/opt/pw-browsers`). Google Fonts jsou v sandboxu blokované –
  fonty přes npm `@fontsource/*` (russo-one, saira-condensed, barlow-condensed…) a lokální `<link>`. Při bundlu definovat
  `process.env.NEXT_PUBLIC_PRESETKA_TARGET='"web"'` a `process.env.NODE_ENV='"production"'`.
- Na realistické testovací fotky lze použít screenshoty předloh od Petra (jen interně), vyříznutí přes `rembg`
  (model `u2net_human_seg`, ne velký bria model – spadne na paměť).
