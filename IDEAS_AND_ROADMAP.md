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

## 📝 Dine egne idéer
*(Skriv dine egne tanker og idéer herunder, eller bed mig om at opdatere dem for dig!)*

*   *Idé 1: ...*
