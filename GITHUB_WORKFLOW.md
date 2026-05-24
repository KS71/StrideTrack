# 🐙 GitHub Workflow - StrideTrack

Dette dokument beskriver, hvordan vi håndterer Git og GitHub for StrideTrack. Ved at have denne fil kan AI-assistenten altid læse her, hvordan du ønsker dine commits og uploads udført.

---

## 📋 Standard Workflow

Når vi har lavet ændringer i koden og er klar til at uploade til GitHub, følger vi disse trin:

1. **Tjek status**: Se hvilke filer der er ændret.
   ```bash
   git status
   ```
2. **Tilføj ændringer**: Tilføj de ændrede filer til staging.
   ```bash
   git add .
   ```
3. **Commit ændringer**: Skriv en kort, beskrivende commit-besked på dansk (eller engelsk, alt efter hvad du foretrækker).
   *Eksempel:* `git commit -m "feat: tilføjet swipe navigation til historik og indstillinger"`
4. **Push til GitHub**: Send ændringerne op til din repo.
   ```bash
   git push origin main
   ```

---

## 🛠️ Foretrukne Commits & Beskeder

* **Sprog**: Dansk / Engelsk (Vælg dit foretrukne sprog her)
* **Stil**: Korte, præcise beskeder, der forklarer hvad der er ændret.
* **Grene (Branches)**: Vi arbejder direkte på `main` (eller en specifik udviklingsgren, hvis du foretrækker det).

---

## 🔄 Sidste Synkroniseringer
* [x] Oprettet dette workflow-dokument til nem reference.
* *Noter dine seneste store ændringer her...*
