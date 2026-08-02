# Progress - 2026-07-05

## NutriCalc PWA

- Vytvorena lokalna PWA aplikacia NutriCalc vo Vite + React + TypeScript.
- Pridane lokalne ukladanie dat cez IndexedDB:
  - potraviny,
  - jedla,
  - nastavenia,
  - vahove zaznamy.
- Pridane obrazovky:
  - Dnes,
  - Pridat jedlo,
  - Historia,
  - Vaha,
  - Nastavenia.
- `Import dat` bol presunuty z dolnej navigacie do `Nastavenia` ako `Importovat potraviny`, aby spodna lista zostala citatelna na iPhone.
- Jedla sa ukladaju so snapshotom nutricnych hodnot, aby sa stare zaznamy nemenili po buducich importoch databazy.

## Vaha

- Pridana obrazovka `Vaha` bez grafu.
- Pouzivatel vie zapisat:
  - datum merania,
  - vahu v kg.
- Zobrazuje sa:
  - posledna ulozena vaha,
  - zmena oproti predchadzajucemu zaznamu,
  - historia vahovych zaznamov.
- Vahove zaznamy sa daju odstranit.
- Pridany novy IndexedDB store `weights`.
- Databaza bola migrovana z verzie `1` na `2`, existujuce jedla a nastavenia ostavaju zachovane.
- Export archivu `nutricalc-archiv.json` teraz obsahuje aj pole `weights`.
- Import archivu vie obnovit aj historiu vahy.

## Import NutriDatabaze.cz

- Pridany import CSV/TSV exportu z NutriDatabaze.cz.
- Importer bol upraveny na realny export `NutriDatabaze-v9.24-data-export.csv`.
- Podporene stlpce ako:
  - `OrigFdCd`,
  - `OrigFdNm`,
  - `EngFdNam`,
  - `SciNam`,
  - `ENERC [kJ]`,
  - `ENERC [kcal]`,
  - `FAT [g]`,
  - `PROT [g]`,
  - `CHOT [g]`,
  - `NACL [g]`.
- Opraveny problem s kodovanim CSV:
  - subor je vo Windows-1250,
  - appka teraz automaticky deteguje rozbite UTF-8 znaky a dekoduje cez `windows-1250`.
- Overene na realnom CSV:
  - 1136 potravin,
  - 0 preskocenych riadkov.
- CSV export je ignorovany cez `.gitignore`, aby sa neposlal na GitHub.

## Pouzivanie

- Appka pocita nutricne hodnoty podla gramaze.
- Priklad ranajok:
  - 3 vajcia ako cca 150 g,
  - 4 platky slaniny orientacne 40-60 g.
- Zistene, ze slovo `slanina` v NutriDatabaze exporte nie je.
- Ako najblizsia nahrada bola odporucena polozka:
  - `Maso vepřové, bok bez kosti a kůže, pečené`.

## Mobil a PWA

- Pridany `npm run mobile` pre lokalny test v telefone cez Wi-Fi.
- Pridane PWA meta tagy pre Android a iPhone.
- Pridana mobilna spodna navigacia.
- Opravene iPhone PWA rozlozenie:
  - `viewport-fit=cover`,
  - safe-area padding,
  - stabilna vyska cez `100svh` a `-webkit-fill-available`,
  - zakazane horizontalne pretekanie,
  - inputy maju 16 px, aby iOS pri pisani nezoomoval.
- Spodna navigacia bola upravena pre iPhone PWA:
  - je ukotvena ako samostatny spodny riadok layoutu,
  - neplava pri scrollovani,
  - bezova medzera pod listou bola prekryta tmavym pozadim,
  - horizontalny pohyb obrazovky bol zablokovany,
  - text v spodnej liste je hrubsi,
  - vyska spodnej listy bola zmensena pri zachovani velkosti pisma.
- Zvysena verzia service worker cache postupne az na `nutricalc-v13`.

## GitHub

- Inicializovany git repozitar.
- Nastaveny remote:
  - `https://github.com/Neophite2023/nutricalc.git`
- Vytvoreny initial commit:
  - `9b7da0f Initial NutriCalc PWA`
- Pushnute do vetvy `main`.
- Pridany GitHub Actions workflow pre GitHub Pages:
  - `.github/workflows/deploy.yml`
- Pushnuta iPhone PWA oprava:
  - `60d412e Fix iPhone PWA viewport layout`
- Pushnute mobilne opravy spodnej navigacie:
  - `0f70ba7 Fix mobile bottom navigation scroll`,
  - `6f6a63b Anchor mobile nav in app layout`,
  - `ce56a5e Fill mobile safe area below nav`,
  - `9397d05 Prevent mobile horizontal scrolling`,
  - `201c0cc Improve mobile nav text weight`,
  - `3181e32 Reduce mobile nav height`.
- Pushnute sledovanie vahy a export/import vah do archivu:
  - `8ed8d5e Add weight tracking archive`.

## USDA SR Legacy migrácia (2026-07-30)

- Vytvorený adresár `scripts/` so skriptami pre USDA SR Legacy dataset.
- Stiahnutý SR Legacy CSV (~6.7 MB, 7 793 potravín) z `fdc.nal.usda.gov`.
- Vytvorený `scripts/translations.js` – slovník 469 potravinárskych výrazov EN→SK.
- Vytvorený `scripts/build-usda-db.mjs` – generuje flat CSV z relačných USDA dát:
  - parsuje `food.csv`, `food_nutrient.csv`, `nutrient.csv`,
  - pivotuje živiny (11 nutrientov na 1 riadok),
  - prekladá názvy slovenčiny,
  - dopĺňa kJ z kcal (SR Legacy nemá kJ stĺpec).
- Výstup: `usda-data/usda_sr_legacy_sk.csv` – 7 756 riadkov, 16 stĺpcov, ~1.2 MB.
- Formát kompatibilný s `parseNutriDatabazeExport()`:
  - `origfdcd`, `origfdnm`, `engfdnam`,
  - `enerc kcal`, `enerc kj`, `prot`, `fat`, `fasat`, `fams`, `fapu`,
  - `chot`, `sugar`, `fibt`, `ash`, `na`, `water`.
- Overené: 99.78 % názvov preložených (7 739 z 7 756), 595 termínov v slovníku, stĺpce korektne mapované, build prechádza.

## Overenie

- `npm run build` opakovane presiel uspesne.
- Lokalny server vracal HTTP 200.
- Import realneho CSV bol overeny parserom aj v aplikacii.
