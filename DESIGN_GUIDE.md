# 🎨 Design & UI Guide - StrideTrack

Dette dokument beskriver designsystemet for StrideTrack. Det sikrer, at vi bevarer den unikke, premium **Neo-brutalistiske** stil, når vi designer nye knapper, kort og sider.

---

## 🎨 Farvepalette (Tailwind CSS v4)

Vi bruger en energisk, høj-kontrast farvepalette defineret i `index.css`:

*   **Primær Gul (`--color-primary`)**: `#ffc900` (Baggrunde, knapper, fremhævelser)
*   **Accent Pink (`--color-accent-pink`)**: `#ff8fe9` (Sekundære knapper, badges, ikoner)
*   **Baggrund Lys (`--color-background-light`)**: `#fffdf0` (Den bløde, behagelige flødefarvede baggrund)
*   **Teal Accent (`--color-teal-accent`)**: `#23a094` (Succes-tilstande, fuldførte mål, grafer)
*   **Ren Sort/Mørk**: `#000000` (Tekst, tykke kanter og skygger)

---

## 📐 Neo-brutalistiske UI Regler

For at bevare stilen skal alle elementer følge disse regler:

### 1. Tykke Kanter & Hårde Skygger
Undgå bløde skygger (`shadow-lg`). Brug i stedet de hårde, solide sorte skygger:
*   **Lille Skygge**: `border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]` (eller `shadow-hard-sm`)
*   **Standard Skygge**: `border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` (eller `shadow-hard`)
*   **Stor Skygge**: `border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]` (eller `shadow-hard-lg`)

### 2. Typografi
*   Vi bruger **Space Grotesk** (`font-display`) som den primære skrifttype.
*   Overskrifter skal være fede (`font-bold` eller `font-black`) og have tydelig kontrast.

### 3. Interaktive Knapper (Hover & Active)
Når man trykker eller holder musen over en knap, skal den "klikkes ned" (skygges skal blive mindre, og elementet skal flytte sig lidt ned/højre):
```tsx
// Eksempel på en neo-brutalistisk knap
<button className="bg-primary text-black font-bold py-2 px-4 border-2 border-black rounded-lg shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
  Log Walk 🚶‍♂️
</button>
```

---

## 🔮 Kommende UI Opdateringer & Idéer
*   [ ] **Grafer & Diagrammer**: Designe smukke, neo-brutalistiske grafer med sorte rammer og primære farver (gul/pink/teal) til historikken.
*   [ ] **Badges**: Små farverige badges med hårde kanter til præstationer/streaks.
