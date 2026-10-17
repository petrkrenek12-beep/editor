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
- Seznam: `fill` (řádky se protáhnou na výšku až N×, ať panel není prázdný), `groupBy` (řádky nadpisů skupin), `rowsBg` (i `canvas: true` + `blur` = matné sklo z pozadí), `distribute`, `center`, `grid`;
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
- Hráč zápasu – Detail / Celá postava: když popisek statu obsahuje „min“ (MIN, mins, minuty), číslo se vykreslí menší
  (prvky `m1..m3`), aby se „38:29“ vešlo vedle bodů a doskoků. Samostatné pole na minuty Petr nechce.
- Nové (NBL, ŽBL, Repre): `best-five` Ideální pětka kola (3+2 skleněné karty s vyříznutými hráči), `stat-leaders`
  Statističtí lídři (lídr velký s fotkou a obřím číslem + top 5 v řádcích), `preview-compare` Před zápasem – srovnání
  (loga se září, řádky domácí | popisek | hosté). Pozadí a hlavička jako Výsledky kola – Premium (`premiumHeader`).
- Přehled má checklist „Co dnes sdílet“ (Pages.tsx `WEEK_PLAN` podle dne v týdnu, odškrtnutí v localStorage na den).
- Předvolba „Do barev grafiky“ je jemná (rim 12/8, světlo 8, match lum 30) – silný rim dělal svítící obrys u světlých dresů.
- NBL bez starých šablon (anniversary, lineup, player-stats, program, result, results-panorama, results-round, standings
  v `NBL_REMOVED`); ŽBL bez results-panorama. Grafiky ze smazaných šablon se při migraci v61 smažou (náhrobky).
- Forma týmu – série (`streak`, NBL i Repre): fotka se ztrácí do tmavé, obří kovové číslo `{{@streakn:games}}` +
  `{{@streakw:games}}` („výher v řadě“), bilance `{{@record:games}}` mezi linkami, skleněné dlaždice s logem soupeře,
  skóre a pruhem V (zelená) / P (červená). Pole „Velké číslo série a bilance“ (Zobrazit / Skrýt) a „Loga soupeřů u proher“ (Nic / Ztlumit / Černobíle / obojí, `dim.mode`). Logo oBasketu malé.
- BCL má vlastní šablony `bcl-*` (fonty Russo One / Saira Condensed). Předloha: **EuroLeague „Rivalry Series“**
  (Partizan – Panathinaikos) převedená do barev BCL: světelný vír, kovový nadpis Russo One, stříbrný pruh s podtitulkem,
  čas v rohových závorkách.
  - `bcl-program` – 1 zápas = rozložení jako předloha (2 hráči, příjmení nahoře, loga pod hráči, čas/datum/město
    v závorkách, zkratky „SLA vs PAR“, „Živě na“ + TV); 2+ zápasy = skleněné karty mezi hráči.
  - `bcl-mvp` – Hráč zápasu BCL: vyříznutý hráč uprostřed (nevyříznutá fotka jde přes pozadí), kovové příjmení,
    3 (nebo 2) čísla v závorkách, výsledek s logy.

## Projekt „Evropské poháry“ (id `p-bcl`, dříve BCL)
- Liga mistrů FIBA (barvy projektu), FIBA Europe Cup (= „Evropský pohár FIBA“ na Livesportu), Euroliga žen a EuroCup žen.
  Ženské týmy (loga z ŽBL) jsou v projektu jako `p-bcl-zteam-*`, týmy z NBL jako `p-bcl-nteam-*` (`withNblTeams`, stejná loga).
- `bcl-result-fec` – výsledek zápasu FIBA Europe Cup (modrá paleta, logo `asset:comp-fec`), jen výsledek, bez MVP.
- Šablona může mít vlastní barvy `palette` (přepíší brand kit) – tak jsou udělané `bcl-result-elw/ecw` a `bcl-mvp-elw/ecw`
  (kopie BCL šablon, feminizované, logo soutěže `asset:comp-elw` / `asset:comp-ecw`).
  Euroliga žen: tmavě modrá + světle modrá, stříbrné logo. EuroCup žen: fialová + akvamarínová, korálový míč.
- `bcl-week` – Program týdne všech českých týmů v Evropě. Rozložení: svislý kovový nadpis vlevo, skleněný panel se
  zápasy. Vlastní vzhled (Petr nechtěl styl Europa League ani stejné pozadí jako ostatní BCL): `palette` grafit + oranžová
  oBasketu, jen obrysové oblouky z loga oBasketu (`asset:obasketu-lines`, bez nápisu, oranžově + záře), oranžová záře,
  rastr. Logo vlevo nahoře (bez tintu – původní vzhled loga) na střed sloupce s nadpisem, zarovnané s horní hranou panelu; termín bíle s oranžovou linkou, zarovnaný se spodní hranou. Řádky `fill: 1.7` (málo zápasů → vyšší řádky).
  Seznam má `groupBy: "comp"` → před každou soutěží řádek nadpisu (`__header`) s logem soutěže (jako Basket Ženy).
- NBA: všech 30 týmů jako `p-bcl-nba-*` (src/lib/demo/nba.ts), loga NEJSOU v assetech, ale v `public/nba/{key}.png` a
  `{key}-w.png` (URL „/nba/…“ – renderer i UI je berou přímo). Barevná loga z npm `nba-team-logos` (vyrenderovaná SVG),
  bílé verze dopočítané (u odznaků se plocha nejčastější barvy zprůhlední); Portland od Petra (pinwheel).
- `bcl-nba` – Čech v NBA (Vít Krejčí, Portland): podle grafik Blazers (Deni Avdija) – grafitové kouřové pozadí se zrnem,
  3 čísla nahoře (Barlow Condensed italic), křestní jméno v barvě týmu `@team:{{team}}`, obří stříbrné příjmení ZA
  vyříznutým hráčem, pruhy nahoře, tenký rámeček, výsledek s logy a logo NBA dole. Barvy z týmu hráče.
- Smazané (na přání): obecné `p-bcl-program`, `p-bcl-result`; v ŽBL player-stats, program, result, results-carousel,
  results-round, standings (náhrobky v migraci v50).

## Čtení screenshotů (AI)
- Popisky statistik vždy zkratky PTS/REB/AST/STL/BLK/EFF – v promptu i v kódu (`statLabel`, `statText` v ai.ts),
  i v řádcích carouselu (`mvp_name`, `s1_value`…). Hráč zápasu přes `_mvp`, plní i `team_score`/`opponent_score`.
- Program z Livesportu: nadpis dne = datum všech zápasů pod ním, řádek „EVROPA: …“ = soutěž, horní tým = domácí.
  Kód `compOption` převede názvy soutěží na hodnoty šablony a zápasy seřadí (soutěž → datum → čas);
  „Ž“ za názvem = ženský tým (odstraní se, hledá se mezi ženskými týmy).
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

## Čech v NBA (`bcl-nba`, Evropské poháry)
- Podle grafik Portland Trail Blazers (Avdija). Barvy **napevno Portland** (`#E03A3E`) – Krejčí je vždy v Blazers.
- Dvě rozložení podle fotky: vyříznutá → čísla nahoře, obří příjmení za hráčem; nevyříznutá (`photo && !photo.cut`)
  → fotka přes horní část, jméno a čísla pod ní (prvky `u-*`).
- Podmínky umí negaci `!` (např. `hideIf: "photo && !photo.cut"`). Loga NBA týmů v `public/nba` (+ bílé `-w`).
- Barvy v přechodech: `#hex/40` nefunguje (jen `@primary/40` apod.) – použij `rgba()`.
