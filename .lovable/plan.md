

# Täis-sünk ainult magistri-tasemel TalTech ained

Sünk piiratakse magistriõppe (MSc) ainetega — see annab ~800–1200 ainet (mitte 3000+) ja maksab **~500–800 Firecrawl krediiti** ühekordseks täis-sünkimiseks.

## Mida ehitame

### 1. Andmeallikas — TalTech ÕIS, magistri-filter

`sync-courses` edge function uuendatakse:
- Crawlib `https://ois2.taltech.ee/uusois/aine/otsi` magistri-koodide prefiksitega
- TalTechi konventsioon: magistri-ained on tihti **5-kohalise koodiga** (nt `ITC8101`, `MEC9020`) kus 4. number on **8 või 9** (8xxx = MSc, 9xxx = PhD-tase aga MSc-le avatud). Bakalaureuse ained on 0xxx–7xxx.
- Filtreerime parsimisel: ainult need, mille koodimuster vastab `^[A-Z]{3}[89]\d{3}$` või kus aine-leht ütleb sõnaselgelt "magistriõpe" / "Master"
- Prefiksid katame teaduskondade kaupa: ITI, ITA, ITC, ITV, ITP, MAT, TMJ, EER, MEC, YFR, EMR, EAA, EJR (~13 prefiksit × ~80 MSc ainet = ~1000 ainet)

### 2. Crawli batching

- Iga prefiks → eraldi Firecrawl `crawl` (limit 100 lehte, ainult MSc-mustriga URL-id)
- Edge function timeout (~150s) kõigi 13 prefiksi jaoks korraga ei jõua → jagame **3 batchi**:
  - Batch A: IT-teaduskond (ITI, ITA, ITC, ITV, ITP)
  - Batch B: Reaal- ja inseneriteadused (MAT, MEC, EER, EMR, EAA)
  - Batch C: Majandus ja muu (TMJ, YFR, EJR)
- UI-s 3 nuppu + "Sünki kõik MSc" mis kutsub kõik 3 järjest taustal

### 3. Andmebaasi täiendused

`courses` tabelisse uued väljad (migratsioon):
- `name_en text`, `level text` (siia kirjutame `'msc'`), `language text[]`, `faculty text` (prefiksist), `assessment text`, `learning_outcomes text[]`, `instructor text`

`sync_runs`-isse: `prefix text`, et näha milline batch jooksis ja mis seis on.

### 4. UI ümberkorraldus

- **Settings**: eemaldame "Course catalog" kaardi (ei kuulu sinna, see on globaalne süsteem)
- **Õppekava leht** (`/programme`): uus kaart "TalTech magistri-kataloog" — näitab kogu ainete arvu, viimati sünnitud, 3 batch-nuppu + üks "Sünki kõik" nupp, viimase sünk-jooksu seis prefiksite kaupa
- **Courses leht** (`/courses`): lisame otsingu (kood/nimi), filtri teaduskonna järgi, paginatsiooni (50 kaupa), ja iga aine kõrval nupp **"Lisa minu õppekavasse"** → kirjutab `user_courses`-isse staatusega `planned`. Nüüd ei pea iga aine jaoks RTF-i üles laadima.

## Failid

- **Muudame**: `supabase/functions/sync-courses/index.ts` (ÕIS-parser + MSc-filter + batch-režiim), `src/pages/Settings.tsx` (eemaldame kataloogi-kaardi), `src/pages/Programme.tsx` (lisame kataloogi-kaardi 3 batch-nupuga), `src/pages/Courses.tsx` (otsing + filtrid + paginatsioon + "Lisa õppekavasse"), `src/lib/courseProvider.ts` (Supabase-päring `searchCourses({query, faculty, page})`)
- **Migratsioon**: `courses` uued väljad, `sync_runs.prefix`

## Kulud

- **Firecrawl**: ~500–800 krediiti täis-MSc-sünkimiseks (ühekordne); üksiku batchi kordussünk ~200 krediiti
- **Lovable krediidid**: keskmine build-task (1 edge function muudatus, 1 migratsioon, 4 UI-faili)
- **Aeg**: täis-sünk taustal ~10–15 min (3 batchi järjest)

## Skoobist välja

- Bakalaureuse ained (saab hiljem lisada teise nupuga)
- Tunniplaani aja-info (`day`, `start`, `room`) magistri-ainete jaoks — see vajab eraldi tunniplaani-sünki
- EuroTeQ — töötab juba, ei muuda
- Estikeelne UI tõlge

## Hoiatus

Kui ÕIS-i koodimuster (4. number 8/9 = MSc) ei ole 100% täpne kõikides teaduskondades, kasutame fallback'ina ainekava-lehel olevat sõnaselget "õppetase: magistriõpe" välja. Esimese batchi järel kontrollin, kas filter töötab ootuspäraselt — kui ei, kohandame regexi enne ülejäänud batche.

