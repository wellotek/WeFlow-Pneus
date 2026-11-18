# Journal des Modifications (Changelog) — WEFLOW PNEUS

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère à [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2024-11-18

### Ajouté
- **Architecture complète Electron 35 + React 18 + TypeScript + SQLite** en mode WAL haute performance.
- **Identité visuelle WeFlow Pneus officielle** : Thème Dark Navy (`#172235`), Accent Golden Yellow (`#F5BD18`), fonds `#F5F6F8`.
- **Bilinguisme intégral Français (LTR) et Arabe (RTL)** avec détection et bascule dynamique de la sidebar.
- **SAS d'Activation sécurisé** relié au serveur central `https://license.dentisuite.xyz` avec chiffrement matériel DPAPI et tolérance hors-ligne de 7 jours.
- **Assistant d'Initialisation (Onboarding Wizard)** pour la configuration initiale du commerce en 5 étapes.
- **14 modules ERP métier entièrement développés et interconnectés** :
  1. Tableau de bord avec indicateurs financiers et graphiques splinés.
  2. Point de vente (POS) ultra-rapide avec sélection des véhicules et montes avant/arrière.
  3. Gestion des Devis et Factures conformes aux exigences comptables algériennes.
  4. Répertoire Clients et parc de Véhicules avec fiches techniques.
  5. Catalogue de pneumatiques avec recherche dimensionnelle (Largeur/Série/Diamètre/Saison).
  6. Gestion des stocks valorisés et grand livre des mouvements physiques.
  7. Gestion des Achats fournisseurs avec recalcul du PAMP.
  8. Annuaire des Fournisseurs et gestion des encours.
  9. Gestion de l'Atelier et Ordres de Réparation (Montage, Équilibrage, Géométrie, Crevaison).
  10. Planning hebdomadaire des rendez-vous avec indicateur temps réel "current time".
  11. Gestion du SAV, des garanties constructeur et des retours clients.
  12. Gestion de la Caisse avec journal des dépenses et clôture Ticket Z.
  13. Statistiques et Rapports financiers avancés avec export PDF et Excel/CSV.
  14. Paramètres généraux, imprimantes et gestionnaire de sauvegardes automatiques.
- **Moteur d'impression haute fidélité** : Factures A4, Tickets de caisse 58/80mm, Tickets Z, et étiquettes de pneus avec codes-barres vectoriels Code 128.
- **Auto-Update intégré** via `electron-updater` connecté aux GitHub Releases de `wellotek/WeFlow-Pneus-updates`.
- **Installateur Windows NSIS x64** avec raccourcis bureau et menu démarrer.
