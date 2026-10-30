# 🛠️ Forbedringer & nye funktioner – StrideTrack

*Gennemgang af koden, oktober 2026 (version 2.4.1). Tag punkterne ét ad gangen og sæt kryds, når de er færdige.*

---

## 🐞 1. Fejl (rammer eksisterende brugere)

- [x] **1.1 Dark mode virker ikke – fjern knappen** *(lavet okt. 2026, afventer test på telefon)*
  Settings har en sol/måne-knap, og `App.tsx` sætter klassen `dark` på `<html>`, men der findes ingen `dark:`-klasser i komponenterne. Knappen gør intet synligt.
  *Besluttet (okt. 2026):* Mockups af dark mode blev vurderet som ikke pæne. Fjern knappen fra Settings og den ubrugte `theme`-logik (`toggleTheme`, effekten der sætter `dark`-klassen og `theme`-prop'en). Gamle gemte data med `theme: 'dark'` skal ignoreres uden fejl.

- [x] **1.2 Streak bruger UTC-datoer** *(lavet okt. 2026, afventer test på telefon)*
  `calculateStreak` i `components/History.tsx` splitter ISO-strengen ved `T`, hvilket giver UTC-dagen. En tur logget kl. 00:30 dansk tid tæller som dagen før.
  *Løsning:* Brug lokal dato (`toDateString()` eller en `toLocalDateKey`-hjælper) som resten af appen.

- [x] **1.3 Dashboard-heatmap ignorerer ugestart** *(lavet okt. 2026, afventer test på telefon)*
  "Consistency"-gitteret i `components/Dashboard.tsx` er hardkodet til mandag, også når brugeren har valgt søndag. Overskriften "M T W T F S S" er også fast.
  *Løsning:* Brug `weekStart`-prop'en, som Yearly Overview allerede gør.

- [ ] **1.4 Cloud sync kan genoplive slettede ture**
  Sletning sendes til Supabase i baggrunden. Fejler det (fx uden net), ligger turen stadig i skyen og hentes tilbage ved næste sync.
  *Løsning:* Gem en liste over ventende sletninger lokalt og send dem ved næste sync, eller brug "soft delete" med et `deleted_at`-felt.

- [ ] **1.5 Cloud sync kan rulle redigerede ture tilbage**
  Sync sammenligner kun id'er, ikke indhold. En redigering, der ikke nåede op i skyen, bliver aldrig sendt igen, og ændringer fra en anden enhed hentes aldrig ned.
  *Løsning:* Tilføj `updated_at` på hver tur og lad den nyeste version vinde.

- [ ] **1.6 Mål-sync tjekker ikke, hvem der er nyest**
  Logikken er "hvis lokale mål er standard, hent fra skyen, ellers overskriv skyen". En ny telefon med ændrede mål overskriver altid skyen.
  *Løsning:* Sammenlign tidsstempel på seneste `goalHistory`-entry med profilens `updated_at`.

- [x] **1.7 "Last Synced" i skyen viser forkert tidspunkt** *(lavet okt. 2026, afventer test på telefon)*
  Både cloud-sync og Health Connect-sync skriver til det samme felt (`lastSyncDate`). Teksten "Last Synced" under cloud-kontoen i Settings kan derfor vise, hvornår Health Connect sidst kørte, selv om skyen ikke er blevet opdateret.
  *Løsning:* Giv Health Connect sit eget felt, fx `healthConnectLastSync`.

---

## ✨ 2. Forbedringer af det eksisterende

- [ ] **2.1 Grafer med Recharts**
  `recharts` er installeret, men bruges ikke. Søjlediagram med distance pr. måned i Yearly Overview og/eller pr. dag i ugen på Dashboard, i neo-brutalistisk stil.

- [ ] **2.2 Fortryd ved sletning**
  Gælder sletning af en gåtur i History. Langt tryk åbner allerede en bekræftelsesdialog ("Delete Walk?") i appens egen stil, så turen slettes ikke ved et uheld.
  *Lav prioritet:* En "Undo"-toast ville spare brugeren ét tryk, men giver kun lidt ekstra sikkerhed. Kan springes over.

- [ ] **2.3 Native bekræftelser i stedet for `window.confirm`**
  Flere steder bruger appen telefonens standard-pop-up (`window.confirm` / `alert`), som ser fremmed ud i forhold til resten af appen. "Delete Walk?"-dialogen i History er allerede lavet i appens egen stil og kan bruges som skabelon.
  Steder med standard-pop-ups:
  - Slet alle data (2 bekræftelser) – `App.tsx`
  - Backup: eksport fejlede, gendannet, ugyldig fil, læsefejl – `App.tsx`
  - Health Connect: slå til/fra, importér historik, fejlbeskeder, diagnose kopieret – `Settings.tsx`
  - Log ud – `Settings.tsx`
  *Løsning:* Lav én genbrugelig `ConfirmDialog` og én lille besked-toast i appens stil, og udskift alle kald.

- [x] **2.4 Tom-tilstand / første-gang-hint** *(lavet okt. 2026, afventer test på telefon)*
  Med nul ture viser Dashboard bare nuller. Vis fx "Tryk + for at logge din første tur". Løser onboarding-ønsket fra testerne uden en tung tutorial.

- [ ] **2.5 Synlig Health Connect-status**
  Sync kører automatisk, men brugeren kan ikke se det. Vis "Sidst synkroniseret for 3 min. siden" og en lille indikator, mens den kører.

- [x] **2.6 Bundl fonten lokalt** *(lavet okt. 2026, afventer test på telefon)*
  Space Grotesk hentes fra Google Fonts ved hver start. Det virker ikke offline og pinger Google, hvilket strider mod appens privatlivsprofil. Læg fontfilerne i projektet.

- [x] **2.7 Ryd op i død kode og filer** *(lavet okt. 2026, afventer test på telefon)*
  - `tailwind.config.js` bruges ikke længere (Tailwind 4 bruger `@theme` i `index.css`).
  - `GEMINI_API_KEY` i `.env.local` og `vite.config.ts` bruges ikke af appen.
  - `theme`-prop'en på Dashboard bruges ikke.
  - Dobbelt kommentar `// --- Export / Import Logic ---` i `App.tsx`.

- [x] **2.8 Bedre id-generator** *(lavet okt. 2026, afventer test på telefon)*
  `generateId` bruger `Math.random().toString(36)` med 9 tegn. Brug `crypto.randomUUID()`, som allerede bruges i usage tracking, for at undgå kollisioner i skyen.

- [ ] **2.9 Del `App.tsx` og `Settings.tsx` op**
  `App.tsx` (~1000 linjer) blander navigation, sync, Health Connect og backup. `Settings.tsx` er over 1200 linjer. Flyt sync-logik til fx `utils/cloudSync.ts` og Settings-sektioner til egne komponenter. Gør fremtidige ændringer lettere og sikrere.

---

## 🚀 3. Nye funktioner (prioriteret efter værdi i forhold til arbejde)

- [x] **3.1 Badges (egen skærm via Settings)** *(udgivet i 2.5.0, udvidet i 2.5.1)*
  *Besluttet (okt. 2026):* Forsiden skal ikke ændres. Streak bliver, hvor den er (History). Badges får en egen skærm, som åbnes fra et menupunkt "Badges" i Settings.
  - Skærmen viser alle mærker i appens stil: optjente med farve og dato, låste grå/stiplede med fremskridt (fx "33,8 / 42,2 km").
  - Lille fejring i appens stil, når et nyt mærke optjenes.
  - Første sæt på 12 mærker: First steps (1 tur), 10 walks, Globetrotter (100 ture), Marathon (42,2 km i alt), 100 km, 500 km, 1000 km, Month master (månedsmål nået), Week warrior (ugemål 3 uger i træk), Year champion (årsmål nået), On fire (7 dage i træk), 30-day streak.
  - Beregnes ud fra `logs`, så brugere med historik får mærkerne med det samme. Kun optjeningsdatoer gemmes.
  - *Udvidet okt. 2026 til 29 mærker:* flere trin for antal ture (25, 50, 250, 500, 1000), 5000 km, længste enkelttur (10 / 21,1 / 42,2 km), 100-dages streak, 10 uger og 6 måneder i træk, dobbelt ugemål, Early Bird, Night Owl, Comeback og Connected (Health Connect). Distance-mærker har egne runde grænser for miles (fx 500 km / 300 mi).

- [ ] **3.2 Påmindelser**
  Preference-feltet `notifications` findes, men gør ingenting. Lokal notifikation via `@capacitor/local-notifications`, fx torsdag aften: "Du mangler 4 km for at nå ugemålet – 3 dage tilbage."

- [ ] **3.3 Del din milepæl**
  Når et mål nås, generér et billede ("Jeg nåede 120 km i oktober! 🚶") og del via `@capacitor/share`, som allerede er installeret. Gratis markedsføring.

- [ ] **3.4 Bedøm appen**
  Androids In-App Review API, udløst efter en milepæl (fx ugemål nået for 2. gang), ikke fra en menu.

- [ ] **3.5 Varighed og tempo**
  `duration` findes i datamodellen, men manuelle ture får altid "0m 0s". Tilføj et valgfrit tidsfelt i LogWalk og vis tempo (min/km), især nyttigt sammen med Health Connect-data.

- [x] **3.6 Backup-påmindelse** *(lavet okt. 2026, afventer test på telefon)*
  Brugere uden cloud-konto mister alt ved afinstallation eller telefonskift. Appen gemmer allerede tidspunktet for sidste backup-fil og viser det diskret i Settings ("Last: ..."), men minder aldrig brugeren om det.
  *Løsning:* Vis et lille banner på Dashboard, hvis brugeren ikke er logget ind i skyen og sidste backup er over 30 dage gammel (eller aldrig taget). Banneret har en "Tag backup"-knap og kan lukkes. Ingen nye plugins nødvendige.

- [ ] **3.7 Hjemmeskærm-widget**
  Ugens fremskridt ("18/30 km") uden at åbne appen. Kræver native Android-kode, så det er det dyreste punkt.

---

## 📋 Foreslået rækkefølge

1. Fejl 1.1 – 1.3 (små og hurtige)
2. Fejl 1.4 – 1.6 (sync, kræver ændring i Supabase-tabellen)
3. 2.4, 2.6, 3.6 Backup-påmindelse (små UX-gevinster, 3.6 er besluttet)
4. 3.1 Streaks & badges
5. 2.1 Grafer
6. Resten efter lyst og feedback
