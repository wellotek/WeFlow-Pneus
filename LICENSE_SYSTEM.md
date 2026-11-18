# Système de Licence Commerciale Centralisé — WEFLOW PNEUS

**Version du protocole** : v1.0  
**Serveur central** : `https://license.dentisuite.xyz`  
**Identifiant Produit** : `WeFlowPneus` (avec fallback compatible `WEFLOW_PNEUS` / `universal`)

---

## 1. Vue d'Ensemble

Le système de licence de **WEFLOW PNEUS** garantit la protection commerciale du logiciel tout en assurant une flexibilité opérationnelle indispensable aux commerçants (tolérance aux coupures Internet jusqu'à 7 jours consécutifs).

---

## 2. Empreinte Matérielle Unique (Installation ID)

Chaque poste de travail dispose d'un identifiant matériel unique et déterministe généré par `electron/license/installationId.ts` :
1. Extraction du UUID machine (`node-machine-id` ou GUID Windows stocké en registre).
2. Concaténation avec le nom d'hôte (`os.hostname()`) et le SID utilisateur Windows.
3. Hachage cryptographique SHA-256 tronqué à 32 caractères hexadécimaux formatés en blocs :  
   `WFP-XXXX-XXXX-XXXX-XXXX`

---

## 3. Stockage Sécurisé & Intégrité Cryptographique

Le fichier de licence est stocké dans le répertoire utilisateur sous :  
`%APPDATA%/WeFlow Pneus/license.enc`

### 3.1. Chiffrement Matériel DPAPI
Les données sont chiffrées au repos à l'aide de l'API Windows DPAPI via Electron `safeStorage.encryptString()`. Le déchiffrement n'est possible que sur la machine et sous la session Windows où la licence a été activée.

### 3.2. Sceau d'Intégrité HMAC-SHA256
Un hachage d'intégrité est calculé sur l'ensemble des champs critiques (license_id, installation_id, offlineUntil, lifetime, product) :
$$\text{Signature} = \text{HMAC-SHA256}(\text{Payload}, \text{SecretKey})$$
Si un utilisateur modifie manuellement le fichier ou l'horloge système, le sceau d'intégrité est invalidé et l'application bascule immédiatement sur l'écran d'activation bloquant.

---

## 4. Endpoints de l'API Centrale

### 4.1. Activation (`POST /api/public/license/activate`)
**Payload émis :**
```json
{
  "license_id": "LIC-WFP-2024-XXXX",
  "activation_code": "ACT-9999",
  "installation_id": "WFP-A1B2-C3D4-E5F6",
  "product": "WeFlowPneus",
  "version": "1.0.0"
}
```
**Réponse serveur :**
```json
{
  "success": true,
  "status": "valid",
  "lifetime": true,
  "serverToken": "tok_sec_..."
}
```

### 4.2. Validation & Rafraîchissement (`POST /api/public/license/validate`)
Effectuée périodiquement en arrière-plan lorsque la connexion Internet est active. Si le serveur répond avec succès, la date de grâce hors-ligne (`offlineUntil`) est repoussée de 7 jours :
$$\text{offlineUntil} = \text{DateActuelle} + 7 \text{ jours}$$

---

## 5. Fonctionnement Hors-Ligne (Grace Period)

| État | Condition | Comportement de l'Application |
|---|---|---|
| **Actif (En ligne)** | Serveur joint et licence valide | Fonctionnement complet |
| **Actif (Hors-ligne)** | Hors-ligne mais $\text{DateActuelle} \le \text{offlineUntil}$ | Fonctionnement complet sans interruption (badge jaune "Mode Hors-ligne") |
| **Grâce Dépassée** | Hors-ligne et $\text{DateActuelle} > \text{offlineUntil}$ | Écran SAS d'activation bloquant invitant à rétablir la connexion |
| **Révoquée** | Statut retourné `revoked` ou `expired` par le serveur | Écran SAS de blocage avec message explicatif |
