# 💡 Ideas & Roadmap - StrideTrack

Dette dokument bruges til at brainstorme nye ideer, holde styr på ønsker og prioritere funktioner, som vi kan bygge sammen i fremtiden.

---

## 🚀 Kommende Funktioner (Roadmap)

### 📊 Datavisualisering & Grafer
*   **Idé**: Indsæt søjlediagrammer eller linjediagrammer under en ny "Statistik" eller "Historik" sektion.
*   **Hvordan**: Brug `Recharts` med Neo-brutalistisk design (sorte tykke linjer, `--color-primary` gul eller `--color-teal-accent` farvede søjler).
*   **Viser**: Gået distance per dag i denne uge, eller per måned i år.

### 🏆 Gamification, Badges & Streaks
*   **Idé**: Beløn brugeren for at holde en stime (streak) kørende eller nå særlige mål.
*   **Mål-idéer**:
    *   *Ugens kriger*: Nået ugentligt mål 3 uger i træk.
    *   *Maraton-mærket*: Gået i alt 42,2 km.
    *   *Globetrotter*: Logget din 100. gåtur.

### ☁️ Cloud Sync (Valgfri synkronisering via Supabase)
*   **Idé**: Tilføj en valgfri mulighed for at synkronisere data i skyen for at sikre mod datatab, hvis brugeren mister sin telefon.
*   **Arkitektur (Hybrid / Local-first med synkronisering)**:
    *   Appen gemmer fortsat alt i `localStorage` (lynhurtig offline-funktionalitet).
    *   Brugeren kan under Indstillinger logge ind på en profil (e-mail + password).
    *   Når der er internet, synkroniseres data automatisk med en **Supabase** backend i baggrunden.
    *   Hvis man skifter telefon, logger man blot ind, og historikken hentes ned i den nye telefons `localStorage`.
*   **Teknologi & Skalering**:
    *   **Supabase (PostgreSQL)** er valgt, da det er open-source, har indbygget brugerstyring (Auth) og en meget generøs **gratis pakke (Free Tier)**.
    *   *Skaleringsanalyse for 100-500 brugere*: En gåtur fylder ca. 250 bytes. 500 aktive brugere med 5 gåture om ugen vil generere ca. **32,5 MB data om året**. Det passer utrolig nemt inden for Supabases gratis grænse på **500 MB databaseplads** og **50.000 aktive brugere/md**.
    *   Skulle appen vokse til over 10.000+ brugere, kan systemet nemt opgraderes uden kodeændringer.

### 📡 Strava & Google Health Connect Integration
*   **Idé**: Gør det muligt at hente gåture automatisk ind i appen i stedet for at skulle indtaste alting manuelt.
*   **Hvordan**: 
    *   **Strava API**: Forbind din Strava-konto. Da Garmin automatisk kan synkronisere til Strava, vil dine gåture fra Garmin-uret flyde direkte ind.
    *   **Google Health Connect / Apple Health**: Synkroniser lokalt med sundhedsdata direkte på din telefon (Garmin Connect ➡️ Health Connect ➡️ StrideTrack) for at beskytte privatlivet 100%.
*   **Manuel Synkronisering ("Sync Now" knap)**: 
    *   Tilføj en tydelig, fed "Synkroniser" / "Sync Now" knap (f.eks. på Dashboardet eller i bunden af Historik), som man kan trykke på for at hente de seneste gåture med det samme efter sin tur.
    *   Knappen skal vise en sej synkroniseringsanimation og derefter hente og merge nye gåture uden at skabe dubletter.

---

## 💬 Claudes forslag (juli 2026 — endnu ikke besluttet)
*Forslag noteret under testfasen med 25 brugere, prioriteret frem mod Google Play-lancering. Kun idéer — intet er implementeret.*

### Prioriteret før lancering
1.  **✏️ Redigér en gåtur**: Lige nu kan man kun tilføje og slette. Taster man 12 km i stedet for 1,2 km, skal turen slettes og oprettes forfra. Den slags feedback kommer garanteret fra testerne.
2.  **📊 Grafer & statistik**: `recharts` er allerede installeret men bruges ikke. Søjlediagram på Yearly Overview (distance pr. måned) eller Dashboard (ugens dage) i neo-brutalistisk stil (gule/teal søjler, tykke sorte kanter).
3.  **🏆 Streaks & badges**: Beregningslogik oven på eksisterende `logs` — f.eks. "3 uger i træk med nået ugemål", "100. gåtur", "42,2 km i alt". Stærk retention-effekt og godt Play Store-screenshot.

### Efter lancering
4.  **📱 Widget til hjemmeskærmen**: Lille Android-widget med ugens fremskridt ("18/30 km") — daglig synlighed uden at åbne appen.
5.  **🔔 Påmindelser/notifikationer**: "Du mangler 4 km for at nå dit ugemål — 2 dage tilbage." Preference-feltet `notifications` findes allerede men bruges ikke.
6.  **🎉 Del din milepæl**: Generér et delebillede når et mål nås ("Jeg nåede 120 km i juni! 🚶"). Genbruger `@capacitor/share`, som allerede er installeret til backup. Gratis markedsføring.
7.  **📝 Navngiv/notér gåture**: `title`-feltet findes i datamodellen, men alle manuelle ture hedder "New Walk". Lad brugeren skrive f.eks. "Tur ved stranden".

---

## 💬 Testerrapport (juli 2026 — 25 brugere)
*Vurdering af "Testers Community"-rapporten. Bemærk: rapporten er en generisk skabelon (samme 4 forslag som gives til enhver app, ingen omtale af StrideTracks egne funktioner). Tillægges begrænset vægt som kvalitetsvurdering.*

*   **🌙 Dark mode** *(værd at lave)*: God for aften-brug. CSS-variabler findes allerede, men neo-brutalistisk stil kræver omtanke — sorte kanter forsvinder i mørk tilstand og skal måske gøres lyse.
*   **⭐ "Bedøm app"-knap** *(værd at lave)*: Brug Androids native In-App Review API (via Capacitor), ikke bare et Play Store-link. Udløs efter en milepæl (fx nået ugemål 2. gang), ikke i en menu.
*   **🧭 Walkthrough/onboarding** *(lav værdi)*: Kun hvis testerne reelt var forvirrede. Appen er simpel — en tung tutorial kan irritere. Overvej i stedet empty-state-hints.
*   **🔍 ASO** *(marketing, ikke kode)*: Gøres direkte i Play Console tættere på lancering.

---

## ✨ Nye idéer (Claude, juli 2026)

*   **📭 Empty state / første-gang-hint**: Billig løsning på onboarding-behovet — fx "Tryk + for at logge din første tur" i tomme lister, i stedet for en fuld walkthrough.
*   **↩️ "Undo" på sletning**: En toast med "Fortryd" i ~5 sek. frem for en bekræftelsesdialog. Billigere og bedre UX. Passer sammen med den kommende redigér-gåtur-funktion.
*   **💾 Backup-påmindelse**: Data ligger kun i `localStorage`, så alt mistes ved app-sletning. En blid påmindelse om at tage backup (`@capacitor/share` er allerede installeret) er reel værdi indtil Supabase-sync er live.

### ✅ Allerede på plads (afklaret under gennemgang juli 2026)
*   **Miles/km**: Fuldt implementeret med rigtig omregning (gemmes i km, konverteres ved visning — `toDisplayDistance`/`toStorageDistance` i `utils.ts`). Virker på tværs af hele appen. Skal ikke bygges.
*   **Ændring af mål er sikkert**: `handleUpdateGoal` rører aldrig `logs`. Måländringer gemmes i `goalHistory` med tidsstempel, så gammelt fremskridt måles mod det mål, der gjaldt dengang. Ingen data slettes.

---

## 📝 Dine egne idéer
*(Skriv dine egne tanker og idéer herunder, eller bed mig om at opdatere dem for dig!)*

*   *Idé 1: ...*
