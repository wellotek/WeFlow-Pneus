# AUDIT TECHNIQUE, FONCTIONNEL ET PRODUIT COMPLET : WEFLOW PNEUS

> **Date de l'audit** : 18 Novembre 2026  
> **Auteurs** : Équipe Senior d'Ingénierie & Produit WeFlow  
> **Produit** : WeFlow Pneus (Gestion de magasin de pneumatiques, ateliers de montage et réparation)  
> **Plateforme** : Windows Desktop x64 (Windows 10 / Windows 11)  
> **Référence d'architecture** : Easy Menuizy (`C:\Easy menuizy`) & WeFlow Électroménager (`C:\Weflow Electromenager`)  
> **Serveur de licences** : `https://license.dentisuite.xyz`  
> **Livrable** : `docs/AUDIT_WEFLOW_PNEUS.md`

---

## 1. CONVENTIONS DE CERTIFICATION DES CONSTATS

- **[FAIT CONFIRMÉ]** : Démontré par le code source existant, l'exécution locale d'outils, des requêtes réseau directes ou l'inspection d'artefacts.
- **[HYPOTHÈSE]** : Explication plausible étayée par la structure du code, confirmée lors des tests.
- **[À VÉRIFIER]** : Point nécessitant une clé réelle fournie ou un matériel physique particulier (ex: imprimante thermique 80mm).

---

## 2. AUDIT DE L'ARCHITECTURE DE RÉFÉRENCE (EASY MENUIZY & WEFLOW ÉLECTROMÉNAGER)

### 2.1 Socle technique validé [FAIT CONFIRMÉ]
L'inspection du repository `C:\Easy menuizy` et du projet frère `C:\Weflow Electromenager` montre un socle technique robuste et éprouvé :
- **Electron 35.7.5**, **Node.js 26/20**, **TypeScript 5.6.0**.
- **React 18.3.1**, **Vite 7.0.0**, **electron-vite 5.0.0**.
- **Tailwind CSS 4.3.3** (`@tailwindcss/vite`).
- **better-sqlite3 11.10.0** avec pragmas `journal_mode = WAL`, `foreign_keys = ON`, `synchronous = NORMAL`, `busy_timeout = 5000`.
- **Zod 4.6.5** pour la validation stricte des entrées IPC et du stockage.
- **i18next 26.4.2** et **react-i18next 17.0.15** pour le bilinguisme Français (LTR) / Arabe (RTL).
- **electron-updater 6.6.2** et **electron-builder 26.15.3**.

### 2.2 Sécurité et isolation du Preload [FAIT CONFIRMÉ]
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- Preload sécurisé sans fuite de Node.js ni de requêtes SQL arbitraires (`db:query` interdit).
- Contrôle de la provenance des appels IPC via `isTrustedIpcSender()`.
- Contrôle strict de licence sur chaque appel métier sensible (`assertLicensed()`).

### 2.3 Système de Licence Centralisée [FAIT CONFIRMÉ]
- Le serveur central `https://license.dentisuite.xyz` est actif et répond en JSON :
  - `POST /api/public/license/activate`
  - `POST /api/public/license/validate`
  - `POST /api/public/license/refresh`
- Test d'interrogation réel exécuté : le serveur renvoie les structures attendues (ex: `{"authorized":false,"error":"License not found"}`).
- Chiffrement local via DPAPI (`safeStorage` d'Electron) dans `userData/license.enc` et `userData/installation.id.enc`.
- Signature HMAC-SHA256 déterministe pour garantir l'intégrité de l'état de licence et interdire toute altération locale de dates ou de statut.
- Période de grâce hors-ligne de 7 jours (168h) avec seuil d'alerte à 48h.

### 2.4 Système d'Impression et d'Étiquetage [FAIT CONFIRMÉ]
- Impression vectorielle HTML/CSS via fenêtres d'arrière-plan Electron (`BrowserWindow` caché à zoom fixe 1.0).
- Exportation PDF vectorielle via `webContents.printToPDF` sans dépendance externe.
- Générateur vectoriel SVG Code 128 pur pour les codes-barres des pneus et références.
- Respect strict des marges et du sens de lecture LTR / RTL.

### 2.5 Distribution et Auto-Update [FAIT CONFIRMÉ]
- GitHub Releases utilisé comme canal de mise à jour.
- Repositories cibles pour WeFlow Pneus :
  - Source : `wellotek/WeFlow-Pneus`
  - Distribution : `wellotek/WeFlow-Pneus-updates`
- L'authentification `gh` CLI est vérifiée avec le compte `wellotek` (droits `repo`, `workflow`).

---

## 3. AUDIT UI/UX & IDENTITÉ VISUELLE WEFLOW PNEUS

### 3.1 Palette de couleurs officielle
- **Dark Charcoal** : `#111827`
- **Dark Navy** : `#172235` (Arrière-plan sidebar principale)
- **Sidebar Secondary** : `#1F2937`
- **Golden Yellow** : `#F5BD18` (Accent principal, boutons d'action majeurs, états actifs)
- **White** : `#FFFFFF`
- **Background** : `#F5F6F8` (Arrière-plan pages métier)
- **Borders** : `#E5E7EB`
- **Secondary Text** : `#667085`

### 3.2 Logo et Icône de l'Application [FAIT CONFIRMÉ]
- Fichier `PNEU_LOGO.ico` (270 398 octets) extrait avec succès en `logo_extracted.png` (256x256 RGBA) et prêt pour `resources/icon.ico` et `resources/branding/logo.png`.
- Roue stylisée avec jante bleue et typographie bicolore ("WeFlow" en blanc, "Pneus" en Golden Yellow).

### 3.3 Disposition des 14 Modules dans la Sidebar
1. لوحة التحكم (Tableau de bord)
2. المبيعات (Ventes & POS)
3. عروض الأسعار والفواتير (Devis et Factures)
4. الزبائن والسيارات (Clients et Véhicules)
5. العجلات والمراجع (Pneus et Références)
6. المخزون (Stock)
7. المشتريات (Achats)
8. الموردون (Fournisseurs)
9. خدمات الورشة (Services Atelier)
10. المواعيد (Rendez-vous)
11. الضمانات والإرجاع (Garanties et Retours)
12. الصندوق والمصاريف (Caisse et Dépenses)
13. التقارير (Rapports)
14. الإعدادات (Paramètres)

*En Arabe (RTL) : Sidebar positionnée à DROITE.*  
*En Français (LTR) : Sidebar positionnée à GAUCHE.*

---

## 4. MODÈLE DE DONNÉES SQLITE MÉTIER POUR PNEUMATIQUES

Le modèle de données comportera au minimum :
1. `settings` & `store_profile`
2. `users`, `roles`, `permissions`
3. `products` (pneus, jantes, valves, accessoires)
4. `tire_brands` (Michelin, Continental, Pirelli, Goodyear, Bridgestone, etc.)
5. `tire_specifications` (largeur, hauteur/profil, diamètre, indice de charge, indice de vitesse, type/saison)
6. `vehicle_brands`, `vehicle_models`, `vehicle_engines`, `vehicle_fitments` (moteur de compatibilité avant/arrière)
7. `stock_locations`, `stock_balances`, `stock_movements` (traçabilité complète)
8. `customers`, `customer_vehicles` (gestion parc véhicules clients et immatriculations)
9. `suppliers`, `purchases`, `purchase_items`, `goods_receipts` (réceptions validées augmentant le stock)
10. `sales`, `sale_items`, `sale_payments` (ventes POS déduisant le stock atomiquement)
11. `quotations`, `quotation_items`, `invoices` (documents commerciaux avec conversion directe devis -> vente)
12. `services` (montage, démontage, équilibrage, réparation crevaison, géométrie, permutation), `service_orders`
13. `appointments` (planification d'atelier avec détection de chevauchement)
14. `warranties`, `returns` (réclamations, échanges et avoirs avec mouvements de stock associés)
15. `cash_registers`, `cash_movements`, `expenses` (clôture journalière Z, caisse, entrées/sorties)
16. `document_sequences` (numérotation continue sans trou pour factures, devis, bons)
17. `audit_logs` & `schema_migrations`
