# Procédure de Build & Publication de Release — WEFLOW PNEUS

**Version Cible** : `1.0.0`  
**Dépôt Source** : [wellotek/WeFlow-Pneus](https://github.com/wellotek/WeFlow-Pneus)  
**Dépôt Distribution** : [wellotek/WeFlow-Pneus-updates](https://github.com/wellotek/WeFlow-Pneus-updates)

---

## 1. Étapes Préalables au Build

1. **Validation de l'intégrité TypeScript** :
   ```bash
   npm run typecheck
   ```
2. **Analyse de la qualité du code** :
   ```bash
   npm run lint
   ```
3. **Exécution de la suite de tests automatisés** :
   ```bash
   node scripts/test-runner.cjs
   ```
4. **Compilation des bundles Electron & Vite** :
   ```bash
   npm run build
   ```

---

## 2. Génération du Package de Production Windows

Lancer la commande de packaging Electron Builder :
```bash
npm run electron:build
```

Cette commande exécute `electron-builder --win --x64` et produit dans le dossier `release/` :
- `WeFlow-Pneus-1.0.0-win-x64-setup.exe` : Installateur Windows complet avec assistant NSIS et raccourci bureau.
- `latest.yml` : Manifeste de mise à jour pour `electron-updater` avec hash SHA-512.

---

## 3. Publication sur GitHub Releases

À l'aide de l'outil en ligne de commande `gh` authentifié :

```bash
# 1. Commit et Tag sur le dépôt source
git add .
git commit -m "chore: release v1.0.0 production build"
git tag v1.0.0
git push origin master --tags

# 2. Création de la Release sur le dépôt de distribution
gh release create v1.0.0 \
  --repo wellotek/WeFlow-Pneus-updates \
  --title "WeFlow Pneus v1.0.0 — Commercial Release" \
  --notes "Version commerciale inaugurale de WEFLOW PNEUS avec 14 modules métier, licence centralisée et auto-update opérationnel." \
  release/WeFlow-Pneus-1.0.0-win-x64-setup.exe \
  release/latest.yml
```
