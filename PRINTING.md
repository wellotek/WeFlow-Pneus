# Système d'Impression & Documents Commerciaux — WEFLOW PNEUS

**Service d'Impression** : `electron/services/printService.ts`  
**Moteur de Templates** : `electron/services/documentTemplates.ts`  
**Générateur de Codes-Barres** : `electron/services/barcodeGenerator.ts`

---

## 1. Types de Documents Pris en Charge

| Type de Document | Format Cible | Technologie | Fonctionnalités |
|---|---|---|---|
| **Facture de Vente** | A4 Portrait | HTML5 / CSS Paged Media / PDF | Mentions légales, TVA 19%, NIF/NIS/RC, signature & cachet |
| **Devis Client** | A4 Portrait | HTML5 / CSS Paged Media / PDF | Validité 30 jours, coordonnées complètes, conditions de règlement |
| **Ticket de Caisse** | Thermique 58mm / 80mm | Direct ESC/POS via WebContents | En-tête compact, articles, mode de règlement, rendu monnaie |
| **Ticket Z (Clôture Caisse)** | Thermique 80mm | Direct ESC/POS via WebContents | Total recettes, ventilation modes de paiement, écarts constatés |
| **Ordre de Réparation (OR)** | A4 Portrait | HTML5 / CSS Paged Media / PDF | Prestations atelier, pièces fournies, affectation pont/technicien |
| **Étiquettes Pneus** | Thermique 100x50mm / 70x40mm | Code 128 SVG pur vectoriel | Réf, Marque, Dimension géante, Code-barres scannable |

---

## 2. Génération Vectorielle des Codes-Barres Code 128

Le moteur n'utilise aucune dépendance externe lourde : il calcule directement les modulations de barres selon la norme ISO/IEC 15417 Code 128 :
- Génère un flux SVG compact et ultra-net.
- Lecture optique instantanée par douchette laser ou scanner 2D.
- Aucune déformation ou flou d'interpolation lors de l'impression thermique.

---

## 3. Workflow d'Impression Electron

```
Données Métier (Vente, Pneu, Session)
  │
  ├─> Compilation du Template HTML + CSS + Code-barres SVG
  │
  ├─> Instanciation d'une BrowserWindow masquée (show: false)
  │
  ├─> Chargement des données via webContents.loadURL('data:text/html;charset=utf-8,...')
  │
  ├─> Option A: webContents.print({ silent: false }) -> Dialogue imprimante Windows
  │   Option B: webContents.printToPDF(...) -> Fichier PDF enregistré sur le disque
  │
  └─> Destruction propre de la fenêtre temporaire
```
