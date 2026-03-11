# SPEC.md - Spécifications techniques pour les agents de développement

## Vue d'ensemble du système

Compta-Loader est un outil d'automatisation hybride combinant Puppeteer (Node.js) et AutoHotkey pour automatiser la saisie de recettes locatives dans JD2M.

### Contrainte fondamentale

**Pourquoi AutoHotkey ?** Lorsqu'on clique sur "Importer" dans JD2M, le navigateur ouvre le sélecteur de fichier natif de Windows (`<input type="file">`). Ce dialogue ne peut PAS être contrôlé par Puppeteer car il s'exécute en dehors du contexte du navigateur. La solution hybride AHK est donc obligatoire.

---

## Architecture technique

### Stack technique

- **Runtime** : Node.js (ES6/modules CommonJS)
- **Browser automation** : Puppeteer Core (v23.0.0)
- **GUI automation** : AutoHotkey v2
- **Configuration** : Fichier JS module export

### Diagramme de séquence

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   Entry     │     │   Process    │     │  Puppeteer  │     │     AHK     │
│   Point     │────▶│   Receipts   │────▶│   (Chrome)  │────▶│  (Windows)  │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                           │                                           │
                           │  1. Parse filename                        │
                           │  2. Extract: name, date, amounts          │
                           │                                           │
                           │───────────────────────────────────────────▶│
                           │              3. Launch Chrome             │
                           │                                           │
                           │◀───────────────────────────────────────────│
                           │              4. Navigate to recettes      │
                           │                                           │
                           │───────────────────────────────────────────▶│
                           │              5. Fill form                 │
                           │                                           │
                           │◀───────────────────────────────────────────│
                           │              6. Click "Importer"          │
                           │                                           │
                           │───────────────────────────────────────────▶│
                           │              7. Exec AHK script           │
                           │                                           │
                           │◀───────────────────────────────────────────│
                           │              8. File dialog handled       │
                           │                                           │
                           │───────────────────────────────────────────▶│
                           │              9. Click "Confirmer"         │
                           │                                           │
                           │◀───────────────────────────────────────────│
                           │              10. Click "Enregistrer"      │
                           │                                           │
```

---

## Modules et responsabilités

### 1. main.js (Entry Point CLI)

**Rôle** : Traitement d'une quittance unique via arguments CLI

**Interface** :
```javascript
// Arguments: node main.js <renterName> <loyerHorsCharges> <charges> <date> <filePath>
node main.js "Dupont" "800" "50" "15/01/2024" "path/to/file.pdf"
```

**Flux** :
1. Parse arguments `process.argv.slice(2)`
2. Appelle `connection.login()`
3. Appelle `goToRecettes.navigate(page)`
4. Appelle `receiptProcessor.fillReceiptDataAndImportFile(page, data)`

### 2. ProcessRecettes.js (Entry Point Batch)

**Rôle** : Traitement par lot de toutes les quittances d'une année

**Interface** :
```javascript
// Argument: node ProcessRecettes.js <year>
node ProcessRecettes.js 2024
```

**Flux** :
1. Construit le chemin : `{baseAccountingPath}/{year}/Recettes/AT`
2. Scanne le répertoire avec `fs.readdir()`
3. Parse chaque fichier avec `parseReceiptFilename()`
4. Boucle sur chaque quittance et appelle la même chaîne que main.js

**Format de parsing** :
```
Quittance--<NomLocataire>--<YYYYMMDD>--<Loyer>--<Charges>.pdf
// Ex: Quittance--Dupont--20240115--800v00--50v00.pdf
```

### 3. Connection.js

**Rôle** : Gestion de l'authentification JD2M

**Points clés** :
- Lance Chrome avec `headless: false` (obligatoire pour l'interaction visuelle)
- Viewport fixé à 666x728 (taille choisie pour la stabilité des sélecteurs)
- Mot de passe lu depuis `process.env.JD2M_MDP`
- Utilise `Locator.race()` avec plusieurs stratégies de sélection

**Fragilités connues** :
- Les IDs des boutons sont dynamiques (ex: `#g65ffd02af9f2589f99fbf88ec730060f`)
- Si JD2M change sa page de login, tous les sélecteurs doivent être mis à jour

### 4. NavToRecettes.js

**Rôle** : Navigation depuis la page d'accueil vers la section Recettes

**Étapes** :
1. Clique sur le bouton menu mobile (`button.d-lg-none`)
2. Sélectionne l'année fiscale dans le dropdown
3. Clique sur "Recettes" dans le menu

**Dépendance** : Nécessite d'être déjà connecté

### 5. FillReceiptDataAndImportFile.js

**Rôle** : Cœur de la logique métier - remplissage du formulaire

**Étapes détaillées** :

1. **Clic "Ajouter"** : Ouvre le formulaire de nouvelle recette
2. **Sélection Article** : Choisit "Location longue durée" (valeur `-42462`)
   - **IMPORTANT** : Cette valeur `-42462` est l'ID interne JD2M de l'article
3. **Remplissage montants** :
   - Loyer hors charges → champ ID `gTTC-montant-sub-article-559715`
   - Charges → champ ID `gTTC-montant-sub-article-45818785`
4. **Remplissage libellés** : `{renterName} {date}` dans les deux champs Libelle
5. **Remplissage date** : Format `DD/MM/YYYY`
6. **Clic "Importer"** : Ouvre le file picker
7. **Exécution AHK** : Appelle `runAhkScript()` avec le chemin du fichier
8. **Clic "Confirmer"** : Confirme l'import du fichier
9. **Clic "Enregistrer"** : Sauvegarde la recette

**Points d'attention** :
- Les IDs des champs de montant (`559715`, `45818785`) sont spécifiques à l'article "Location longue durée"
- Si on change d'article, ces IDs changent
- Le libellé est dupliqué sur les deux lignes (loyer et charges)

### 6. AhkRunner.js

**Rôle** : Wrapper Node.js pour exécuter les scripts AHK

**Implémentation** :
```javascript
// Commande générée:
// "C:\Program Files\AutoHotkey\v2\AutoHotkey.exe" "ahk_scripts\import_file.ahk" "chemin\fichier.pdf"
```

**Gestion d'erreurs** :
- Vérifie que le paramètre n'est pas vide
- Capture stdout/stderr
- Rejette la Promise en cas d'erreur

### 7. WaitForClickable.js

**Rôle** : Utilitaire de robustesse pour le clic sur éléments

**Logique** :
- Prend un tableau de sélecteurs alternatifs
- Essaie chaque sélecteur avec un timeout de 40s
- Utilise `page.evaluate()` pour cliquer via JavaScript (bypass des problèmes d'offset)
- Arrête au premier succès

**Usage** : Principalement pour le bouton "Enregistrer" qui peut apparaître avec différents IDs

### 8. FormatUtils.js

**Rôle** : Formatage des données parsées

**Fonctions** :
- `formatDate(YYYYMMDD)` → `DD/MM/YYYY`
- `formatAmount("800v00")` → `"800,00"` (remplace 'v' par ',')

### 9. Config.js

**Rôle** : Configuration centralisée

**Structure** :
```javascript
{
  paths: {
    chromeExecutable,    // Chemin Chrome
    ahkExecutable,       // Chemin AHK v2
    baseAccountingPath   // G:\Mon Drive\Comptabilite\Locatif\8_Richet
  },
  credentials: {
    email,               // gerbault.guilhem@gmail.com
    passwordEnvVar       // JD2M_MDP
  },
  app: {
    defaultTimeout: 5000,
    longTimeout: 12000,
    maxRetryTime: 40000,
    retryInterval: 500
  },
  files: {
    ahkScriptsDir: "ahk_scripts",
    importScriptName: "import_file.ahk"
  }
}
```

### 10. ahk_scripts/import_file.ahk

**Rôle** : Automatisation du file picker Windows

**Logique AHK** :
1. Récupère le chemin du fichier depuis `A_Args[1]`
2. Attend la fenêtre "JD2M - Google Chrome"
3. Attend la fenêtre "Ouvrir" (file picker)
4. Clique sur `Edit1` (champ de texte du chemin)
5. Envoie le chemin du fichier avec `SendInput`
6. Appuie sur Tab puis Entrée pour valider

**Contraintes** :
- Nécessite que la fenêtre Chrome ait exactement le titre "JD2M - Google Chrome"
- Si Chrome est en anglais ou modifié, le titre change et le script échoue
- Le control `Edit1` est le champ de texte standard dans les dialogues Windows

---

## Points de fragilité et maintenance

### 1. Sélecteurs DOM (HAUTE PRIORITÉ)

**Problème** : JD2M utilise des IDs dynamiques générés côté serveur

**Exemple de sélecteurs actuels** :
```javascript
// IDs qui peuvent changer :
#g65ffd02af9f2589f99fbf88ec730060f  // Bouton connexion
#ge7d9a91a4f901a72d8633230d4d350d2  // Menu Recettes
#g8266dd9078dd799027adbb0908505247  // Bouton Importer
#g303a74098e356909ffcf68b9bd4ca1b0  // Bouton Confirmer
#g0aea5a3b4fbea02dad40ffdfe0e622b3  // Bouton Enregistrer
```

**Stratégie de mitigation** :
- Utiliser `Locator.race()` avec plusieurs alternatives (ARIA, XPath, texte)
- Privilégier les sélecteurs ARIA quand disponibles (`::-p-aria(Email)`)
- Documenter les changements dans les commits

### 2. IDs des articles (MOYENNE PRIORITÉ)

**Problème** : Les champs de montant ont des IDs spécifiques à l'article sélectionné

**Actuellement** (Article "Location longue durée" = -42462) :
```javascript
#gTTC-montant-sub-article-559715   // Loyer HC
#gTTC-montant-sub-article-45818785 // Charges
#Libelle-sub-article-559715        // Libellé Loyer
#Libelle-sub-article-45818785      // Libellé Charges
```

**Si changement d'article** : Tous ces IDs changent. Il faut :
1. Inspecter le DOM avec DevTools
2. Noter les nouveaux IDs
3. Mettre à jour `FillReceiptDataAndImportFile.js`

### 3. Délais et timeouts (BASSE PRIORITÉ)

**Configuration actuelle** (Config.js) :
- `defaultTimeout` : 5000ms
- `longTimeout` : 12000ms
- `maxRetryTime` : 40000ms

**Si le site est lent** : Augmenter `defaultTimeout` et `longTimeout`

### 4. Titre de la fenêtre Chrome (MOYENNE PRIORITÉ)

**Dans import_file.ahk** :
```autohotkey
If WinExist("JD2M - Google Chrome")
```

**Si le titre change** (langue, version Chrome) :
- Modifier le titre dans le script AHK
- Ou utiliser une classe de fenêtre plus générique

### 5. Structure des dossiers (BASSE PRIORITÉ)

**Chemin actuel** :
```
G:\Mon Drive\Comptabilite\Locatif\8_Richet\{year}\Recettes\AT\
```

**Si déplacement du Drive** : Modifier `baseAccountingPath` dans `Config.js`

---

## Extensions possibles

### 1. Support de nouveaux types de recettes

Pour ajouter un nouvel article (ex: "Location saisonnière") :

1. Identifier l'ID de l'article dans JD2M (via DevTools)
2. Modifier `FillReceiptDataAndImportFile.js` ligne 55 :
   ```javascript
   .fill('-42462'); // Remplacer par le nouvel ID
   ```
3. Identifier les nouveaux IDs des champs de montant
4. Ajouter une logique conditionnelle si besoin de champs différents

### 2. Support multi-locataires

Actuellement le traitement est séquentiel. Pour du parallèle :
- **ATTENTION** : JD2M peut détecter les connexions simultanées suspectes
- Solution : Créer des profils Chrome séparés avec Puppeteer

### 3. Gestion des erreurs avancée

**Idées** :
- Capture d'écran automatique en cas d'erreur (`page.screenshot()`)
- Retry avec backoff exponentiel
- Notification (email/Slack) en cas d'échec
- Log dans un fichier JSON structuré

### 4. Interface graphique

**Stack suggérée** :
- Electron pour une app desktop
- Ou simple serveur web + formulaire HTML
- Lancer le processus Node.js en backend

---

## Tests et validation

### Tests manuels recommandés

1. **Test de connexion** : Vérifier que `node -e "require('./Connection').login()"` ouvre Chrome et se connecte
2. **Test de parsing** : Vérifier que `parseReceiptFilename()` extrait correctement les données
3. **Test AHK isolé** : Lancer directement `import_file.ahk` avec un chemin de test
4. **Test end-to-end** : Créer un faux fichier PDF et lancer `main.js`

### Validation du format de fichier

Script de validation rapide :
```javascript
const { parseReceiptFilename } = require('./ProcessRecettes');
const result = parseReceiptFilename('Quittance--Dupont--20240115--800v00--50v00.pdf');
console.log(result);
// Doit afficher: { renterName: 'Dupont', date: '15/01/2024', ... }
```

---

## Ressources externes

### Documentation Puppeteer
- https://pptr.dev/guides/what-is-puppeteer
- https://pptr.dev/api/puppeteer.locator

### Documentation AutoHotkey v2
- https://www.autohotkey.com/docs/v2/
- https://www.autohotkey.com/docs/v2/lib/WinExist.htm

### JD2M
- Site : https://app.jedeclaremonmeuble.com
- **Note** : Aucune API officielle disponible, d'où l'automatisation navigateur

---

## Checklist pour les nouveaux développeurs

- [ ] Node.js installé (v16+)
- [ ] `npm install` exécuté
- [ ] Variable d'env `JD2M_MDP` configurée
- [ ] Chrome installé au chemin configuré
- [ ] AutoHotkey v2 installé
- [ ] Accès au dossier `G:\Mon Drive\Comptabilite\...`
- [ ] Test de connexion réussi
- [ ] Test de parsing de fichier réussi
- [ ] Test AHK isolé réussi
- [ ] Test end-to-end avec un vrai fichier PDF

---

**Dernière mise à jour** : 2024
**Version** : 1.0
