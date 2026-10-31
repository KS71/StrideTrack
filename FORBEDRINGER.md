# 🛠️ Forbedringer & nye funktioner – StrideTrack

*Gennemgang af koden, oktober 2026 (version 2.4.1). Tag punkterne ét ad gangen og sæt kryds, når de er færdige.*
*Status 31. okt. 2026: Seneste version på GitHub er 2.5.1 (versionCode 28). 2.5.0 er live på Google Play.*

---

## 🐞 1. Fejl (rammer eksisterende brugere)

- [x] **1.1 Dark mode virker ikke – fjern knappen** *(udgivet i 2.4.2)*
  Settings har en sol/måne-knap, og `App.tsx` sætter klassen `dark` på `<html>`, men der findes ingen `dark:`-klasser i komponenterne. Knappen gør intet synligt.
  *Besluttet (okt. 2026):* Mockups af dark mode blev vurderet som ikke pæne. Fjern knappen fra Settings og den ubrugte `theme`-logik (`toggleTheme`, effekten der sætter `dark`-klassen og `theme`-prop'en). Gamle gemte data med `theme: 'dark'` skal ignoreres uden fejl.

- [x] **1.2 Streak bruger UTC-datoer** *(udgivet i 2.4.2)*
  `calculateStreak` i `components/History.tsx` splitter ISO-strengen ved `T`, hvilket giver UTC-dagen. En tur logget kl. 00:30 dansk tid tæller som dagen før.
  *Løsning:* Brug lokal dato (`toDateString()` eller en `toLocalDateKey`-hjælper) som resten af appen.

- [x] **1.3 Dashboard-heatmap ignorerer ugestart** *(udgivet i 2.4.2)*
  "Consistency"-gitteret i `components/Dashboard.tsx` er hardkodet til mandag, også når brugeren har valgt søndag. Overskriften "M T W T F S S" er også fast.
  *Løsning:* Brug `weekStart`-prop'en, som Yearly Overview allerede gør.

- [x] **1.4 Cloud sync kan genoplive slettede ture** *(rettet, klar til 2.6.0)*
  Sletning sendes til Supabase i baggrunden. Fejler det (fx uden net), ligger turen stadig i skyen og hentes tilbage ved næste sync.
  *Løsning (okt. 2026):* Sletning er nu "soft delete" (`deleted_at` i skyen). Appen gemmer id'et i `pendingCloudDeletes`, indtil skyen har bekræftet, og sender det igen ved næste sync. Andre enheder fjerner turen, når de ser `deleted_at`.

- [x] **1.5 Cloud sync kan rulle redigerede ture tilbage** *(rettet, klar til 2.6.0)*
  Sync sammenligner kun id'er, ikke indhold. En redigering, der ikke nåede op i skyen, bliver aldrig sendt igen, og ændringer fra en anden enhed hentes aldrig ned.
  *Løsning (okt. 2026):* Hver tur har `updatedAt` lokalt og `updated_at` i skyen. Ved sync vinder den nyeste version begge veje. Logikken ligger i `utils/cloudSync.ts` (`mergeWalks`).

- [x] **1.6 Mål-sync tjekker ikke, hvem der er nyest** *(rettet, klar til 2.6.0)*
  Logikken er "hvis lokale mål er standard, hent fra skyen, ellers overskriv skyen". En ny telefon med ændrede mål overskriver altid skyen.
  *Løsning (okt. 2026):* Profilen har `goals_updated_at`. Seneste `goalHistory`-entry sammenlignes med den, og den nyeste vinder (`resolveGoals` i `utils/cloudSync.ts`). Enheder/preferencer hentes kun ned på en frisk installation.

  **Kræver migration i Supabase før 2.6.0 udgives:** kør `supabase/2026-10-31_sync_timestamps.sql` i SQL Editor (tre nye kolonner: `walks.updated_at`, `walks.deleted_at`, `profiles.goals_updated_at`). Uden den fejler sync.

- [x] **1.7 "Last Synced" i skyen viser forkert tidspunkt** *(udgivet i 2.4.3)*
  Både cloud-sync og Health Connect-sync skriver til det samme felt (`lastSyncDate`). Teksten "Last Synced" under cloud-kontoen i Settings kan derfor vise, hvornår Health Connect sidst kørte, selv om skyen ikke er blevet opdateret.
  *Løsning:* Giv Health Connect sit eget felt, fx `healthConnectLastSync`.

---

## ✨ 2. Forbedringer af det eksisterende

- [x] **2.1 Grafer** *(udgivet i 2.6.1)*
  `recharts` er installeret, men bruges ikke. Søjlediagram med distance pr. måned i Yearly Overview og/eller pr. dag i ugen på Dashboard, i neo-brutalistisk stil.
  *Løsning (okt. 2026, forslag A valgt):* Søjlediagrammet erstatter de 12 måneds-bokse i Yearly Progress. Gul = distance, grøn = månedsmål nået, stiplet linje = aktuelt månedsmål, indeværende måned er indrammet, fremtidige måneder er stiplede stubbe. Bedste måned har tal. Lavet i ren SVG (ingen Recharts) for at ramme stilen præcist og holde bundle'et lille. `recharts` kan fjernes fra `package.json`. Dashboard-grafen (forslag B) er ikke lavet. Under grafen kom desuden en "This year"-sektion med 14 farvekodede nøgletal (pink = antal, gul = distance, grøn = rekorder, teal = vedholdenhed), og siden må scrolle.

- [ ] **2.2 Fortryd ved sletning**
  Gælder sletning af en gåtur i History. Langt tryk åbner allerede en bekræftelsesdialog ("Delete Walk?") i appens egen stil, så turen slettes ikke ved et uheld.
  *Lav prioritet:* En "Undo"-toast ville spare brugeren ét tryk, men giver kun lidt ekstra sikkerhed. Kan springes over.

- [x] **2.3 Native bekræftelser i stedet for `window.confirm`** *(lavet, klar til 2.6.0)*
  Flere steder bruger appen telefonens standard-pop-up (`window.confirm` / `alert`), som ser fremmed ud i forhold til resten af appen. "Delete Walk?"-dialogen i History er allerede lavet i appens egen stil og kan bruges som skabelon.
  Steder med standard-pop-ups:
  - Slet alle data (2 bekræftelser) – `App.tsx`
  - Backup: eksport fejlede, gendannet, ugyldig fil, læsefejl – `App.tsx`
  - Health Connect: slå til/fra, importér historik, fejlbeskeder, diagnose kopieret – `Settings.tsx`
  - Log ud – `Settings.tsx`
  *Løsning (okt. 2026):* `components/Dialog.tsx` giver `useDialog()` med `confirm(...)` (Promise) og `notify(...)` (toast). Alle `window.confirm`/`alert` er udskiftet.

- [x] **2.4 Tom-tilstand / første-gang-hint** *(udgivet i 2.4.3)*
  Med nul ture viser Dashboard bare nuller. Vis fx "Tryk + for at logge din første tur". Løser onboarding-ønsket fra testerne uden en tung tutorial.

- [x] **2.5 Synlig Health Connect-status** *(lavet, klar til 2.6.0)*
  Sync kører automatisk, men brugeren kan ikke se det. Vis "Sidst synkroniseret for 3 min. siden" og en lille indikator, mens den kører.
  *Løsning (okt. 2026):* Settings viser "Last checked: 3 min ago" (også når intet nyt blev fundet) og en "Sync now"-knap. En lille fast pille øverst på skærmen vises, mens Health Connect- eller cloud-sync kører.

- [x] **2.6 Bundl fonten lokalt** *(udgivet i 2.4.3)*
  Space Grotesk hentes fra Google Fonts ved hver start. Det virker ikke offline og pinger Google, hvilket strider mod appens privatlivsprofil. Læg fontfilerne i projektet.

- [x] **2.7 Ryd op i død kode og filer** *(udgivet i 2.4.3)*
  - `tailwind.config.js` bruges ikke længere (Tailwind 4 bruger `@theme` i `index.css`).
  - `GEMINI_API_KEY` i `.env.local` og `vite.config.ts` bruges ikke af appen.
  - `theme`-prop'en på Dashboard bruges ikke.
  - Dobbelt kommentar `// --- Export / Import Logic ---` i `App.tsx`.

- [x] **2.8 Bedre id-generator** *(udgivet i 2.4.3)*
  `generateId` bruger `Math.random().toString(36)` med 9 tegn. Brug `crypto.randomUUID()`, som allerede bruges i usage tracking, for at undgå kollisioner i skyen.

- [ ] **2.9 Del `App.tsx` og `Settings.tsx` op**
  `App.tsx` (~1000 linjer) blander navigation, sync, Health Connect og backup. `Settings.tsx` er over 1200 linjer. Flyt sync-logik til fx `utils/cloudSync.ts` og Settings-sektioner til egne komponenter. Gør fremtidige ændringer lettere og sikrere.

---

## 🚀 3. Nye funktioner (prioriteret efter værdi i forhold til arbejde)

- [x] **3.1 Badges (egen skærm via Settings)** *(udgivet i 2.5.0, udvidet i 2.5.1)*
  *Besluttet (okt. 2026):* Ingen badge-gitter på forsiden. Streak bliver, hvor den er (History). Badges får en egen skærm, som åbnes fra "Achievements → Badges" i Settings og fra knappen øverst til højre på mål-kortet på Dashboard (i 2.5.1 erstattede den den ekstra mål-knap).
  - Skærmen viser alle mærker i appens stil: optjente med farve og dato, låste grå/stiplede med fremskridt (fx "33,8 / 42,2 km").
  - Lille fejring i appens stil, når et nyt mærke optjenes.
  - Første sæt på 12 mærker: First steps (1 tur), 10 walks, Globetrotter (100 ture), Marathon (42,2 km i alt), 100 km, 500 km, 1000 km, Month master (månedsmål nået), Week warrior (ugemål 3 uger i træk), Year champion (årsmål nået), On fire (7 dage i træk), 30-day streak.
  - Beregnes ud fra `logs`, så brugere med historik får mærkerne med det samme. Kun optjeningsdatoer gemmes.
  - *Udvidet okt. 2026 til 29 mærker:* flere trin for antal ture (25, 50, 250, 500, 1000), 5000 km, længste enkelttur (10 / 21,1 / 42,2 km), 100-dages streak, 10 uger og 6 måneder i træk, dobbelt ugemål, Early Bird, Night Owl, Comeback og Connected (Health Connect). Distance-mærker har egne runde grænser for miles (fx 500 km / 300 mi).

- [x] **3.8 Sider uden scroll** *(udgivet i 2.5.1)*
  Dashboard, Log Walk, Set Your Target og Yearly Progress passer nu på én skærm, centreret med lige meget luft foroven og forneden (`FIXED_VIEWS` i `App.tsx`). Set Your Target fik samme header-stil som de andre sider og et større mål-felt. Scroll er stadig teknisk slået til, så tastaturet ikke skjuler felter. History og Settings scroller som før.

- [ ] **3.2 Påmindelser**
  Preference-feltet `notifications` findes, men gør ingenting. Lokal notifikation via `@capacitor/local-notifications`, fx torsdag aften: "Du mangler 4 km for at nå ugemålet – 3 dage tilbage."

- [ ] **3.3 Del din milepæl**
  Når et mål nås, generér et billede ("Jeg nåede 120 km i oktober! 🚶") og del via `@capacitor/share`, som allerede er installeret. Gratis markedsføring.

- [ ] **3.4 Bedøm appen**
  Androids In-App Review API, udløst efter en milepæl (fx ugemål nået for 2. gang), ikke fra en menu.

- [ ] ~~**3.5 Varighed og tempo**~~ *(droppet, besluttet 31. okt. 2026)*
  `duration` findes i datamodellen, men manuelle ture får altid "0m 0s". Tilføj et valgfrit tidsfelt i LogWalk og vis tempo (min/km), især nyttigt sammen med Health Connect-data.

- [x] **3.6 Backup-påmindelse** *(udgivet i 2.4.2)*
  Brugere uden cloud-konto mister alt ved afinstallation eller telefonskift. Appen gemmer allerede tidspunktet for sidste backup-fil og viser det diskret i Settings ("Last: ..."), men minder aldrig brugeren om det.
  *Løsning:* Vis et lille banner på Dashboard, hvis brugeren ikke er logget ind i skyen og sidste backup er over 30 dage gammel (eller aldrig taget). Banneret har en "Tag backup"-knap og kan lukkes. Ingen nye plugins nødvendige.

- [ ] **3.7 Hjemmeskærm-widget**
  Ugens fremskridt ("18/30 km") uden at åbne appen. Kræver native Android-kode, så det er det dyreste punkt.

---

## 📋 Foreslået rækkefølge (resten)

1. ~~Fejl 1.4 – 1.6 (cloud sync)~~ *rettet, afventer migration + test*
2. ~~2.3 Egen bekræftelsesdialog~~, ~~2.5 Health Connect-status~~ *lavet, afventer test* (3.5 droppet)
3. 3.2 Påmindelser, 3.3 Del milepæl, 3.4 Bedøm appen
4. ~~2.1 Grafer~~ *udgivet i 2.6.1*
6. 2.9 Opdeling af `App.tsx` / `Settings.tsx` og 3.7 Widget efter lyst
