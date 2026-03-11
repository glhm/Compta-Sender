# SPEC.md - Spécifications techniques pour les agents de développement

**Version** : 2.0  
**Dernière mise à jour** : 2025

## Vue d'ensemble du système

Compta-Loader est un outil d'automatisation hybride combinant Puppeteer (Node.js), AutoHotkey et API Kimi K2.5 pour automatiser la saisie de recettes et dépenses locatives dans JD2M.

### Architecture générale

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Entry Points  │────▶│  Processors      │────▶│   Puppeteer     │
│   (scripts/)    │     │   (src/processors)│     │   (Chrome)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                              ┌────────────────────────┘
                              ▼
                        ┌─────────────────┐
                        │   AutoHotkey    │
                        │   (File picker) │
                        └─────────────────┘
```

### Flux Recettes vs Dépenses

```
RECETTES (Quittances):
Fichier PDF ──► Parse nom fichier ──► Données structurées ──► Formulaire JD2M

DÉPENSES (Factures):
Fichier PDF ──► Conversion image ──► OCR Kimi API ──► Extraction données ──► Formulaire JD2M
```

---

## Stack technique

- **Runtime** : Node.js (ES6/modules CommonJS)
- **Browser automation** : Puppeteer Core (v23.0.0)
- **GUI automation** : AutoHotkey v2
- **OCR** : Kimi K2.5 API (Moonshot AI)
- **PDF → Image** : pdf2pic
- **HTTP client** : axios

---

## Structure du projet

```
scripts/                    # Points d'entrée
├── run-recettes.js        # Traitement batch quittances
└── run-depenses.js        # Traitement batch factures

src/
├── config/                # Configuration
│   ├── Config.js          # Configuration centralisée
│   └── categories-mapping.json  # Mapping catégories → IDs JD2M
│
├── core/                  # Modules cœur (réutilisables)
│   ├── Connection.js      # Authentification JD2M
│   ├── AhkRunner.js       # Exécution scripts AHK
│   ├── OcrExtractor.js    # OCR avec cache Kimi
│   └── PropertyResolver.js # Détection bien depuis chemin fichier
│
├── navigation/            # Navigation dans JD2M
│   ├── NavToRecettes.js   # Menu → Recettes
│   └── NavToDepenses.js   # Menu → Dépenses
│
├── forms/                 # Remplissage formulaires
│   ├── FillReceiptDataAndImportFile.js   # Formulaire recette
│   └── FillDepenseDataAndImportFile.js   # Formulaire dépense
│
├── processors/            # Logique métier batch
│   ├── ProcessRecettes.js  # Traitement recettes (obsolète, voir scripts/)
│   └── ProcessDepenses.js  # Traitement dépenses (obsolète, voir scripts/)
│
└── utils/                 # Utilitaires
    ├── FormatUtils.js     # Formatage dates/montants
    └── WaitForClickable.js # Retry avec plusieurs sélecteurs

ahk_scripts/
└── import_file.ahk        # Gestion file picker Windows
```

---

## Configuration

### Fichier src/config/Config.js

```javascript
{
  properties: {
    '8_Richet': {
      path: '8_Richet',
      name: '8 Charles Richet',
      logementId: '280209574'  // ID JD2M
    },
    '55_Auduc': {
      path: '55_Auduc',
      name: '55 Renée Auduc',
      logementId: '561805757'  // ID JD2M
    }
  },
  
  kimi: {
    apiKeyEnvVar: "KIMI_API_KEY",
    apiUrl: "https://api.moonshot.cn/v1/chat/completions",
    model: "kimi-k2.5"
  },
  
  cache: {
    dir: ".ocr-cache"
  }
}
```

### Variables d'environnement requises

```bash
JD2M_MDP=votre_mot_de_passe_jd2m
KIMI_API_KEY=votre_cle_api_kimi
```

---

## Modules détaillés

### 1. PropertyResolver.js (Nouveau)

**Rôle** : Détecte automatiquement le bien immobilier depuis le chemin du fichier.

**Méthodes** :
- `resolvePropertyFromPath(filePath)` → Retourne `{ key, name, logementId }`
- `getAllProperties()` → Liste tous les biens configurés
- `getPropertyByKey(key)` → Récupère un bien par sa clé

**Logique** : Cherche quel sous-chemin (`8_Richet` ou `55_Auduc`) est présent dans le chemin du fichier.

### 2. OcrExtractor.js (Nouveau)

**Rôle** : Extraction des données de factures via API Kimi avec cache.

**Workflow** :
1. Vérifier le cache (hash MD5 du PDF)
2. Convertir PDF page 1 → PNG (pdf2pic)
3. Appeler API Kimi avec l'image en base64
4. Parser la réponse JSON
5. Sauvegarder en cache
6. Nettoyer le fichier image temporaire

**Configuration du cache** :
- Clé : Hash MD5 du contenu du fichier PDF
- Format : JSON avec `montant_ttc` et `date_facture`
- Emplacement : `.ocr-cache/{hash}.json`

**Prompt API** :
```
Extrais les informations de cette facture en JSON strict avec ce format: 
{"montant_ttc": number, "date_facture": "JJ/MM/AAAA"}. 
Le montant doit être un nombre (pas de €, pas d'espaces). 
La date doit être au format JJ/MM/AAAA.
```

### 3. FillDepenseDataAndImportFile.js (Nouveau)

**Différences avec FillReceiptDataAndImportFile.js** :

| Aspect | Recettes | Dépenses |
|--------|----------|----------|
| Navigation | Recettes | Dépenses |
| Sélection bien | Optionnel | Obligatoire |
| Montants | Loyer + Charges | Un seul TTC |
| Source données | Nom fichier | OCR |
| Catégories | Fixe (Location longue durée) | Variable selon dossier |

**Étapes formulaire dépense** :
1. Cliquer "Ajouter"
2. Sélectionner logement (`#Logement.Oid`)
3. Sélectionner catégorie (`#Article.Oid`)
4. Remplir montant TTC (`#gTTC-montant`)
5. Remplir libellé optionnel (`#Libelle`)
6. Remplir date (`#gDate`)
7. Clic "Importer" → AHK → "Confirmer" → "Enregistrer"

### 4. scripts/run-recettes.js (Nouveau)

**Logique** :
1. Année courante : `new Date().getFullYear()`
2. Pour chaque bien configuré :
   - Scanner `{basePath}/{bien}/{year}/Recettes/AT/`
   - Parser les noms de fichiers `Quittance--*.pdf`
   - Connexion JD2M (une seule fois)
   - Navigation vers Recettes
   - Traitement batch avec sélection du logement
3. Afficher résumé global

### 5. scripts/run-depenses.js (Nouveau)

**Logique** :
1. Vérifier `KIMI_API_KEY`
2. Année courante
3. Pour chaque bien :
   - Scanner `{basePath}/{bien}/{year}/Depenses/*/`
   - Pour chaque sous-dossier (catégorie) :
     - Mapper le nom du dossier vers `categoryId` (JSON)
     - Pour chaque PDF :
       - OCR (avec cache)
       - Si succès → Formulaire JD2M
       - Si échec → Ajouter à `failedFiles[]`
4. Afficher résumé + liste des échecs

---

## Mapping des catégories

### Fichier src/config/categories-mapping.json

```json
{
  "depenses": {
    "travaux": { "id": "-82482", "label": "Travaux" },
    "copro": { "id": "8244754", "label": "Copropriété" },
    "assurance_pno": { "id": "559707", "label": "Assurance PNO" },
    "cfe": { "id": "8244748", "label": "CFE" },
    "comptable": { "id": "8244744", "label": "Comptable" },
    "eau": { "id": "1203054", "label": "Eau" },
    "elec": { "id": "559706", "label": "Électricité" },
    "internet": { "id": "43603679", "label": "Internet" },
    "menage": { "id": "1483344", "label": "Entretien/Ménage" },
    "mobilier": { "id": "37432702", "label": "Mobilier" },
    "oga": { "id": "6837312", "label": "OGA" }
  }
}
```

**Mapping dossier → clé JSON** (dans run-depenses.js) :
```javascript
const mapping = {
  'OGA': 'oga',
  'Mobilier': 'mobilier',
  'Menage': 'menage',
  'Internet': 'internet',
  'Entretien': 'menage',  // Regroupé
  'Elec': 'elec',
  'Eau': 'eau',
  'Comptable': 'comptable',
  'CFE': 'cfe',
  'Assurance_PNO': 'assurance_pno',
  'Copro': 'copro',
  'travaux': 'travaux',
  'Travaux': 'travaux'
};
```

---

## Points de fragilité et maintenance

### HAUTE PRIORITÉ

1. **Sélecteurs DOM** : Les IDs sont dynamiques
   - Localisation : `Connection.js`, `NavTo*.js`, `Fill*DataAndImportFile.js`
   - Mitigation : `Locator.race()` avec alternatives (ARIA, XPath, CSS)
   - Exemple d'ID à surveiller : `#g8266dd9078dd799027adbb0908505247`

2. **API Kimi** : Service externe
   - Rate limiting possible
   - Changement de format de réponse
   - Clé API à renouveler

3. **IDs Logements** : Si JD2M réorganise les biens
   - 8_Richet : `280209574`
   - 55_Auduc : `561805757`

### MOYENNE PRIORITÉ

4. **Cache OCR** : Structure à maintenir
   - Format JSON : `{ "montant_ttc": number, "date_facture": "JJ/MM/AAAA" }`
   - Clé : Hash MD5 du fichier PDF
   - Si format change → invalider le cache

5. **Titre fenêtre Chrome** : Pour AHK
   - Doit être exactement "JD2M - Google Chrome"
   - Si Chrome change de langue → modifier `import_file.ahk`

### BASSE PRIORITÉ

6. **Structure dossiers** : Si organisation Drive change
   - Modifier `Config.js` → `baseAccountingPath`
   - Modifier mapping catégories si nouveaux dossiers

---

## Troubleshooting

### Problème : Fenêtre fichier se rouvre immédiatement après traitement

**Symptôme** : Après avoir cliqué sur "Ouvrir" dans la fenêtre Windows, la fenêtre de fichier se rouvre immédiatement pour la quittance suivante avant que la précédente soit enregistrée.

**Cause** : Le script passe trop vite à la quittance suivante. JD2M met du temps à :
- Sauvegarder la quittance en base
- Fermer complètement le formulaire
- Rafraîchir la liste

**Solution** (déjà implémentée) :

1. **Dans `FillReceiptDataAndImportFile.js`** : Attendre que le formulaire soit complètement fermé
```javascript
// Après clic sur "Enregistrer"
await page.waitForFunction(() => {
  const ajouterBtn = document.querySelector('#Ajouter');
  return ajouterBtn && ajouterBtn.offsetParent !== null;
}, { timeout: 15000 });
```

2. **Dans `run-recettes.js`** : Pause de 1 seconde entre chaque quittance
```javascript
if (processed < receipts.length) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

---

### Problème : Clic sur "Importer" ne fonctionne pas

**Symptôme** : Le bouton "Importer" est trouvé mais le clic ne déclenche pas l'ouverture du sélecteur de fichier.

**Cause** : Les clics Puppeteer standards peuvent ne pas déclencher les événements JavaScript de JD2M correctement.

**Solution** : Utiliser `clickWhenVisible()` qui utilise `page.evaluate()` pour cliquer via JavaScript natif :
```javascript
await clickWhenVisible(page, [
  '#g8266dd9078dd799027adbb0908505247',
  '::-p-aria(publish Importer)',
  '::-p-text(Importer)'
]);
```

---

### Problème : Script AHK ne trouve pas la fenêtre "Ouvrir"

**Symptôme** : Le script AHK affiche "La fenêtre 'Ouvrir' n'a pas été trouvée" ou ne fait rien.

**Cause** : Le script vérifie une seule fois si la fenêtre existe. Si le clic sur "Importer des" met du temps à ouvrir la boîte de dialogue, le script a déjà échoué.

**Solution** : Ajouter `WinWait` dans le script AHK pour attendre jusqu'à 5 secondes :
```autohotkey
WinWait("Ouvrir", "", 5)
If WinExist("Ouvrir")
{
    ; ... traitement
}
```

---

### Problème : Timeout sur les sélecteurs dynamiques

**Symptôme** : `Timed out after waiting 5000ms` sur des éléments qui existent pourtant dans le DOM.

**Cause** : Les IDs des éléments dans JD2M sont dynamiques et changent entre les sessions.

**Solution** : Utiliser `Locator.race()` avec plusieurs alternatives :
```javascript
await puppeteer.Locator.race([
  page.locator('#g8266dd9078dd799027adbb0908505247'),  // ID dynamique
  page.locator('::-p-aria(publish Importer)'),         // ARIA label
  page.locator('::-p-text(Importer)'),                 // Texte
  page.locator('button:has-text("Importer")')          // CSS selector
]).setTimeout(15000).click();
```

---

### Problème : Variables d'environnement non lues

**Symptôme** : `Variable d'environnement KIMI_API_KEY non définie` alors que la variable est définie.

**Cause** : Le nom de la variable dans `Config.js` ne correspond pas à celle définie dans l'environnement système.

**Solution** : Vérifier le mapping dans `src/config/Config.js` :
```javascript
kimi: {
  apiKeyEnvVar: "API_KIMI_KEY",  // Doit correspondre au nom exact de la variable système
  // ...
}
```

Vérifier avec :
```bash
node -e "console.log(process.env.API_KIMI_KEY)"
```

---

### Problème : Chemin AHK incorrect

**Symptôme** : `Error: Cannot find module` ou le script AHK n'est pas trouvé.

**Cause** : Le chemin vers le script AHK est construit depuis `src/core/AhkRunner.js` qui pointe vers `src/core/ahk_scripts/` au lieu de `ahk_scripts/` à la racine.

**Solution** : Corriger le chemin dans `AhkRunner.js` :
```javascript
// Avant (incorrect)
const ahkScriptPath = path.join(__dirname, config.files.ahkScriptsDir, scriptName);

// Après (correct)
const ahkScriptPath = path.join(__dirname, '..', '..', config.files.ahkScriptsDir, scriptName);
```

---

## Extensions possibles

### 1. Support d'un troisième bien

1. Ajouter dans `Config.js` :
```javascript
'Nouveau_Bien': {
  path: 'Nouveau_Bien',
  name: 'Nom du bien',
  logementId: 'ID_JD2M'
}
```

2. Créer la structure de dossiers correspondante dans le Drive

### 2. Nouvelle catégorie de dépense

1. Créer le dossier dans `Depenses/`
2. Ajouter le mapping dans `run-depenses.js` → `normalizeCategoryName()`
3. Ajouter dans `categories-mapping.json`
4. Trouver l'ID JD2M correspondant via DevTools

### 3. Traitement années multiples

Modifier les entry points pour accepter une liste d'années :
```javascript
const years = process.argv[2] ? process.argv[2].split(',') : [new Date().getFullYear()];
```

### 4. Interface graphique

- Electron pour app desktop
- Ou serveur web simple (Express)
- Lancer les scripts Node.js en backend

---

## Tests et validation

### Tests manuels recommandés

**Test Recettes** :
```bash
node scripts/run-recettes.js
```
- Vérifier parsing des noms de fichiers
- Vérifier sélection du logement
- Vérifier upload des PDF

**Test Dépenses** :
```bash
node scripts/run-depenses.js
```
- Vérifier OCR avec un fichier test
- Vérifier cache (relancer le script)
- Vérifier gestion des échecs

**Test unitaire OCR** :
```javascript
const OcrExtractor = require('./src/core/OcrExtractor');
const ocr = new OcrExtractor();
ocr.extract('./test-facture.pdf').then(console.log);
```

### Validation des catégories

```javascript
const mapping = require('./src/config/categories-mapping.json');
console.log(mapping.depenses['travaux']);  // Doit afficher l'ID
```

---

## Checklist pour les nouveaux développeurs

- [ ] Node.js installé (v16+)
- [ ] `npm install` exécuté
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Chrome installé au chemin configuré
- [ ] AutoHotkey v2 installé
- [ ] Accès au dossier Google Drive
- [ ] Test de connexion JD2M réussi
- [ ] Test parsing fichier recette réussi
- [ ] Test OCR avec fichier facture réussi
- [ ] Test AHK isolé réussi
- [ ] Test end-to-end complet réussi

---

## Ressources externes

### Documentation
- Puppeteer : https://pptr.dev/
- AutoHotkey v2 : https://www.autohotkey.com/docs/v2/
- Kimi API : https://platform.moonshot.cn/docs

### JD2M
- Site : https://app.jedeclaremonmeuble.com
- Note : Pas d'API officielle disponible
