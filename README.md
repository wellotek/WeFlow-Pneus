# WEFLOW PNEUS — Logiciel ERP Professionnel Windows Desktop

**Version** : v1.0.0  
**Éditeur** : WeFlow  
**Plateforme** : Windows 10 / Windows 11 (x64)  
**Distribution & Mises à jour** : [wellotek/WeFlow-Pneus-updates](https://github.com/wellotek/WeFlow-Pneus-updates)  
**Dépôt Source** : [wellotek/WeFlow-Pneus](https://github.com/wellotek/WeFlow-Pneus)  
**Licence** : Commerciale propriétaire (Validation centralisée via `https://license.dentisuite.xyz`)

---

## 1. Présentation du Logiciel

**WEFLOW PNEUS** est un progiciel de gestion intégrée (ERP) haute performance conçu sur mesure pour les magasins de vente de pneumatiques, centres de montage rapide, ateliers de réparation et distributeurs de pneus en Algérie.

Conçu selon le principe de **l'Offline-First**, le logiciel fonctionne en totale autonomie avec une base de données relationnelle locale SQLite hautement optimisée (mode WAL), tout en offrant un système de licence sécurisé avec période de grâce de 7 jours et des mises à jour automatiques transparentes via GitHub Releases.

---

## 2. Modules Métier Intégrés (14 Modules)

1. **لوحة التحكم / Tableau de bord** : KPI temps réel (Chiffre d'affaires, Marge brute, Bénéfice net, Total pneus vendus, Stock valorisé), graphique spliné des tendances mensuelles, top des ventes par marque/dimension, alertes de réapprovisionnement critique.
2. **المبيعات / Ventes & Caisse Express (POS)** : Interface point de vente ultra-rapide avec recherche instantanée par dimension/référence/code-barres, sélection véhicule & affectation pneus avant/arrière, calcul automatique HT/TVA 19%/TTC/remise, validation et impression instantanée de tickets thermiques ou factures A4.
3. **عروض الأسعار والفواتير / Devis & Facturation** : Gestion du cycle de vie des devis avec validité paramétrable, conversion en 1 clic vers une vente ferme, édition de factures normalisées avec mentions légales algériennes (RC, NIF, NIS, Article d'Imposition).
4. **الزبائن والسيارات / Clients & Véhicules** : Répertoire complet des clients (particuliers, flottes d'entreprises, transporteurs), carnet des véhicules rattachés avec suivi des montes de pneus (avant et arrière) et kilométrage.
5. **العجلات والمراجع / Pneus & Catalogue** : Catalogue complet avec dimensions normalisées (Largeur / Hauteur / Diamètre), indices de charge & vitesse, profils saisonniers (Été, 4 Saisons, Hiver), types de véhicules (Tourisme, 4x4/SUV, Utilitaire, Poids Lourd), prix d'achat, prix de vente et génération d'étiquettes à code-barres.
6. **المخزون / Gestion des Stocks** : Inventaire valorisé en temps réel (au coût d'achat et au prix de vente), historique inviolable des mouvements de stock (entrées, sorties, ajustements d'inventaire, pertes), seuils d'alerte configurables.
7. **المشتريات / Achats Fournisseurs** : Bons de commande et de réception fournisseur, mise à jour automatique des quantités en stock et recalcul automatique des prix moyens pondérés (PAMP).
8. **الموردون / Fournisseurs** : Base de données des manufacturiers, importateurs et distributeurs avec suivi des encours de paiement et historique des approvisionnements.
9. **خدمات الورشة / Services Atelier** : Ordres de réparation (OR) pour prestations d'atelier (Montage, Équilibrage dynamique, Géométrie 3D / Parallélisme, Réparation crevaison par champignon PRP, Permutation des trains, Gonflage à l'azote), affectation technicien et tarification flexible.
10. **المواعيد / Planning & Rendez-vous** : Grille hebdomadaire interactive par créneaux horaires, indicateur de temps réel rouge ("current time"), détection des conflits de pont/baie et suivi des statuts (Planifié, Confirmé, En cours, Terminé).
11. **الضمانات والإرجاع / Garanties & SAV** : Dossiers de réclamation sous garantie constructeur (hernies, défauts d'adhérence carcasse, vibrations persistantes), expertise technique, échanges à neuf et avoirs clients.
12. **الصندوق والمصاريف / Caisse & Dépenses** : Contrôle du tiroir-caisse avec ouverture de session (fond de caisse initial), journal exhaustif des entrées/sorties espèces, calcul des écarts lors de la clôture et impression du Ticket Z de fin de journée.
13. **التقارير / Statistiques & Finance** : Synthèse financière complète des recettes, ventilation des dépenses par catégorie, répartition des encaissements (Espèces, Chèque, Carte CIB/Edahabia, Virement), export PDF et tableur Excel/CSV.
14. **الإعدادات / Paramètres Système** : Coordonnées du magasin, numéros fiscaux algériens, taux de TVA, choix de l'imprimante A4 et ticket thermique (58mm/80mm), bascule linguistique (Français LTR / Arabe RTL), gestionnaire de sauvegardes et statut de licence.

---

## 3. Identité Visuelle Officielle

L'interface utilisateur respecte rigoureusement la charte graphique :
- **Dark Charcoal** : `#111827`
- **Dark Navy** : `#172235`
- **Sidebar Secondary** : `#1F2937`
- **Golden Yellow** (Accent principal) : `#F5BD18`
- **Fond de page** : `#F5F6F8`
- **Bordures** : `#E5E7EB`
- **Textes secondaires** : `#667085`

---

## 4. Spécifications Techniques

- **Runtime** : Electron 35.7.5
- **UI Framework** : React 18.3.1 + TypeScript 5.6.0 + Vite 7.3.6
- **Styles** : Tailwind CSS 4.3.3 avec adaptation bidirectionnelle automatique (LTR / RTL)
- **Base de données** : SQLite 3 (`better-sqlite3` 11.10.0 en mode WAL et transactions ACID)
- **Sécurité Electron** : `contextIsolation: true`, `nodeIntegration: false`, communication par canaux IPC typés et validés par schémas Zod.
- **Licence** : Chiffrement matériel DPAPI via Electron `safeStorage`, signature HMAC-SHA256, tolérance hors ligne de 7 jours.
- **Mises à jour** : `electron-updater` avec synchronisation GitHub Releases (`wellotek/WeFlow-Pneus-updates`).
- **Packaging** : Electron Builder avec installateur NSIS x64 pour Windows 10/11.

---

## 5. Guide d'Installation et d'Exécution Développeur

### Prérequis
- Node.js >= 20.x
- Windows 10 / 11 64-bit

### Commandes Principales
```bash
# Vérification des types TypeScript
npm run typecheck

# Analyse statique et qualité du code
npm run lint

# Exécution des tests unitaires et d'intégration
npm test

# Lancement en mode développement Desktop
npm run dev

# Compilation de production
npm run build

# Génération de l'installateur Windows x64 NSIS
npm run electron:build
```

---

## 6. Support & Contact

- **Éditeur** : WeFlow
- **Site Web** : https://weflow.dz
- **Support Commercial & Technique** : contact@weflow-pneus.dz
