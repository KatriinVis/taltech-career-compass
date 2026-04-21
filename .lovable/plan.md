

# Iga kasutaja oma õppekava — RTF/PDF üleslaadija

Igal kasutajal on erinev õppekava (TATM, IVCM, IAIB, bakalaureus jne), seega ei saa staatilist faili kasutada. Selle asemel laeb iga kasutaja **oma ainekavad ükshaaval** üles (RTF, PDF, DOCX) — nagu sa just praegu tegid TMJ0140-ga — ja MESA.I parsib need automaatselt sinu isiklikku õppekavasse.

## Mida ehitame

### 1. Ainekava üleslaadija (Settings → "Minu õppekava")

Uus kaart `/settings` lehel:
- **Drag-and-drop ala**: lohista 1+ ainekava faili korraga (`.rtf`, `.pdf`, `.docx`, `.txt`)
- Iga fail → parsitakse → näidatakse eelvaade (kood, nimi, EAP, semester, eeldusained, õpiväljundid)
- Sina märgid: **Läbitud** ✓ / **Pooleli** / **Plaanis**
- "Salvesta" → kõik aineid salvestakse `user_courses` tabelisse

### 2. RTF parsimine (uus, kuna `cvExtract.ts` seda ei toeta)

Lisame `extractTextFromFile()` funktsioonile RTF-toe — lihtne regex tõmbab `\'XX` hex-escape'd ja `{...}` kontrollpäised välja, jättes alles puhta teksti. Töötab ka eesti-tähtedega (`\'F5` = õ, `\'E4` = ä jne).

### 3. Ainekava-spetsiifiline parser (uus edge function `parse-syllabus`)

Sarnaselt `analyze-cv`-le, aga TalTech ainekava jaoks. Azure OpenAI tool-call tagastab struktureeritult:

```json
{
  "code": "TMJ0140",
  "name_et": "Ettevõtluse alused",
  "name_en": "Introduction to Entrepreneurship",
  "ects": 6.0,
  "semester": "sügis-kevad",
  "assessment": "eksam",
  "language": ["eesti", "inglise"],
  "prerequisites": [],
  "learning_outcomes": ["kirjeldab ettevõtluse põhimõisteid...", ...],
  "topics": ["ettevõtluskultuur", "ärimudel", ...],
  "workload": { "lectures": 1.0, "practicals": 0.0, "seminars": 3.0 },
  "skills": ["entrepreneurship", "business-modeling", "team-work"]
}
```

Skills tuletatakse õpiväljunditest sama kontrollvoarakuga, mida `sync-courses` juba kasutab — nii et parsitud aine sobitub sinu karjääriraja soovituste / pudeli-diagrammiga ühtmoodi.

### 4. Sinu isiklik õppekava-vaade (`/programme`)

Uus leht, mis näitab sinu üles laetud aineid:
- **Läbitud** (rohelised märkega) — kogu EAP summa
- **Pooleli** (kollased) — selle semestri aktiivsed
- **Plaanis** (hallid) — tulevased

EAP edenemisriba ja "X EAP puudu lõpetamiseni" arvutus (sa sisestad sihtmärgi: nt 120 EAP magistri jaoks).

### 5. Kalendrisse lisamine

Iga aine kõrval nupp **"Lisa kalendrisse"** → see loob `schedule_events` kirje (kasutab juba olemasolevat süllabuse-→-kalendri loogikat, mis on `Timetable.tsx`-s). Lõputöö verstapostid (kui sa märgid aine `kind: "thesis"`) genereeritakse automaatselt sinu sisestatud kaitsmiskuupäeva järgi — teema, mustand, eelkaitsmine, esitamine.

## Andmebaas

Üks uus tabel (RLS: ainult kasutaja ise):

- **`user_courses`** — `id`, `user_id`, `code`, `name`, `ects`, `semester`, `status` (`completed` | `in_progress` | `planned`), `assessment`, `learning_outcomes` (text[]), `topics` (text[]), `skills` (text[]), `prerequisites` (text[]), `workload` (jsonb), `raw_text`, `source_filename`, `created_at`

Pluss `profiles`-le lisame: `programme_code` (nt "TATM"), `programme_name`, `target_ects` (nt 120), `target_graduation` (date).

## Failid mida muudame

- **Uus**: `src/pages/Programme.tsx` (sinu õppekava-vaade), `supabase/functions/parse-syllabus/index.ts`, migratsioon `user_courses` tabeli + `profiles` lisaväljade jaoks
- **Muudame**: `src/lib/cvExtract.ts` (lisame RTF-toe), `src/pages/Settings.tsx` (lisame ainekava-üleslaadija kaardi), `src/components/app/AppLayout.tsx` (lisame "Õppekava" nav-lingi), `src/pages/Dashboard.tsx` (asendame "Program progress" reaalsete andmetega `user_courses`-st)

## Mis ei ole skoobis

- ÕISist automaatne tõmbamine (vajab VPN-i ja kasutaja-autentimist)
- Hinnete sünk
- Mitme kasutaja õppekavade jagamine

