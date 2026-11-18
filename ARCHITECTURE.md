# Architecture Technique — WEFLOW PNEUS v1.0.0

Ce document détaille l'architecture modulaire, la topologie des processus, les flux de données et les mesures de durcissement sécuritaire du logiciel **WEFLOW PNEUS**.

---

## 1. Topologie des Processus Electron

Le logiciel repose sur une séparation stricte des privilèges entre l'environnement système et le moteur de rendu :

```
┌────────────────────────────────────────────────────────┐
│               Electron Main Process                    │
│  - Cycle de vie de l'application & BrowserWindow       │
│  - Base de données SQLite (better-sqlite3 en mode WAL) │
│  - Moteur de Licence (Chiffrement DPAPI & HMAC-SHA256) │
│  - Service d'impression natif (silent/dialog) & PDF    │
│  - Service de sauvegarde & restauration à chaud        │
│  - Auto-Updater (electron-updater GitHub Releases)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                 Typed IPC Channels (shared/channels.ts)
                 Zod Schema Validation (shared/schemas.ts)
                           │
┌──────────────────────────▼─────────────────────────────┐
│               Secure Preload Script                    │
│  - contextBridge.exposeInMainWorld('pneusApi', ...)    │
│  - Aucun accès Node.js brut exposé au renderer         │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               React Renderer (UI/UX)                   │
│  - React 18, TypeScript, Tailwind CSS, Vite            │
│  - Navigation via HashRouter                           │
│  - i18n bidirectionnel (Français LTR / Arabe RTL)      │
│  - 14 modules métier interconnectés                    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Processus Principal (Electron Main Process)

### 2.1. Initialisation (`electron/main.ts`)
1. **Single Instance Lock** : Empêche les lancements multiples simultanés via `app.requestSingleInstanceLock()`.
2. **Protocole de sécurité** :
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - Blocage de la navigation arbitraire (`will-navigate` filtré).
   - Ouverture des liens externes sécurisée par `shell.openExternal`.
3. **Cycle de vie de la base de données** : Connexion à `app.getPath('userData')/database.sqlite`, exécution automatique des migrations séquentielles (`001_initial_schema`, `002_seed_initial_data`).
4. **Moteur d'auto-update** : Initialisation d'`AppUpdaterService` pointant vers le dépôt public GitHub Releases `wellotek/WeFlow-Pneus-updates`.

---

## 3. Couche d'Accès aux Données (Repositories & SQLite)

Toutes les transactions métier transitent par des repositories dédiés situés dans `electron/database/repositories/` :

- `products.ts` : Gestion du catalogue de pneus, dimensions, indices, calculs de marge.
- `vehicles.ts` : Base marques/modèles et correspondances techniques monte avant/arrière.
- `customers.ts` : Annuaire clients et association des véhicules.
- `suppliers.ts` : Fournisseurs et balance des comptes créditeurs.
- `purchases.ts` : Bons de commande/réception avec incrémentation automatique du stock et mise à jour PAMP.
- `sales.ts` : Enregistrement transactionnel des ventes, décrémentation atomique des stocks, génération du numéro de facture `F-YYYY-XXXX` et écriture du mouvement de caisse associé.
- `quotations.ts` : Devis et conversion en vente directe.
- `services.ts` : Prestations d'atelier et ordres de réparation.
- `appointments.ts` : Calendrier d'atelier et gestion des conflits d'horaires.
- `warranties.ts` : Dossiers de litige SAV et décisions constructeur.
- `cash.ts` : Sessions de caisse, fond de caisse, entrées/sorties manuelles et clôture Z.
- `expenses.ts` : Dépenses d'exploitation par catégorie.
- `dashboard.ts` : Agrégats statistiques pour graphiques et cartes KPI.
- `settings.ts` : Profil du magasin et options globales.

---

## 4. Preload & ContextBridge (`electron/preload.ts`)

L'objet global `window.pneusApi` est scellé via `contextBridge.exposeInMainWorld`. Chaque méthode renvoie une promesse typée correspondant au contrat défini dans `shared/api.ts`.
Aucun payload brut n'est injecté sans validation préalable.

---

## 5. Moteur Frontend React

- **Point d'entrée** : `src/main.tsx` entouré de `src/components/ErrorBoundary.tsx`.
- **SAS d'Activation** : `src/components/ActivationScreen.tsx` intercepte tout accès si la licence n'est pas dans un état valide (`active` ou `offline`).
- **Assistant d'Initialisation** : `src/components/OnboardingWizard.tsx` guide le commerçant lors du premier démarrage (coordonnées, langue, format de ticket, taux de TVA).
- **Mise en page** : `src/components/Layout.tsx` gère la sidebar responsive avec permutation droite (RTL) / gauche (LTR) et surbrillance Golden Yellow (`#F5BD18`).
