# Activer l'envoi réel des formulaires du site

Le site est hébergé sur GitHub Pages : il est **statique**, il ne peut pas envoyer
de courriel lui-même. Les formulaires passent donc par un petit script Google
(Google Apps Script), hébergé gratuitement sur le compte Google de l'école.

**Sans cette installation**, les formulaires restent utilisables : le message
s'ouvre dans le logiciel de messagerie du visiteur, déjà adressé et rédigé, et il
ne lui reste qu'à cliquer sur « Envoyer ». **Avec cette installation**, l'envoi
devient automatique et silencieux pour le visiteur.

- Destinataires : `d.bougreau@lyceemarcelcallo.org` et `anciensdecallo@gmail.com`
- Durée : environ 5 minutes
- À faire une seule fois (compte Google de l'école requis)

---

## 1. Créer le script

1. Ouvrir <https://script.google.com> avec le compte **d.bougreau@lyceemarcelcallo.org**
   (n'importe lequel des deux comptes destinataires convient).
2. Cliquer sur **Nouveau projet**.
3. En haut à gauche, renommer le projet : `Formulaires anciens Callo`.
4. Effacer tout le contenu du fichier `Code.gs` affiché, puis y **coller
   intégralement** le contenu du fichier `Code.txt` de ce dossier
   (<https://anciensdecallo.github.io/outils/apps-script/Code.txt> — s'affiche
   dans le navigateur : `Ctrl+A` puis `Ctrl+C`).
5. Enregistrer (icône disquette ou `Ctrl+S`).

## 2. Vérifier l'envoi (recommandé)

1. Dans la barre de menus, choisir la fonction **`testEnvoi`** puis **Exécuter**.
2. Google demande une autorisation au premier lancement :
   - **Autoriser les accès** → choisir le compte ;
   - si un écran « Google n'a pas validé cette application » s'affiche :
     **Paramètres avancés** → **Accéder à Formulaires anciens Callo (non sécurisé)** ;
   - **Autoriser**.
3. Un courriel « Test — formulaires du site » doit arriver sur **les deux
   adresses**. Si oui, la partie envoi fonctionne.

## 3. Publier le script en application web

1. Bouton **Déployer** (en haut à droite) → **Nouveau déploiement**.
2. À gauche, cliquer sur l'icône engrenage ⚙️ → choisir le type **Application web**.
3. Renseigner :
   - **Description** : `Formulaires du site des anciens`
   - **Exécuter en tant que** : *Moi (d.bougreau@lyceemarcelcallo.org)*
   - **Qui a accès** : *Tout le monde*  ← indispensable pour un site public
4. **Déployer**, puis **copier l'URL de l'application web**. Elle ressemble à :

   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

   Elle se termine obligatoirement par **`/exec`**.

## 4. Renseigner cette URL dans le site

1. Ouvrir le fichier `assets/js/config.js`.
2. Coller l'URL entre les guillemets de `ENDPOINT`, par exemple :

   ```js
   ENDPOINT: "https://script.google.com/macros/s/AKfycb.../exec",
   ```

3. Enregistrer, puis publier la modification sur GitHub (commit + push sur `main`).
   Le site bascule automatiquement en envoi réel : plus de fenêtre de messagerie
   chez le visiteur.

## 5. Contrôler sur le site en ligne

1. Ouvrir <https://anciensdecallo.github.io/lycee/index.html#contact> et envoyer
   un message de test ; idem depuis
   <https://anciensdecallo.github.io/inscription.html>.
2. Le message doit afficher « Merci … votre message est bien parti ».
3. Vérifier la réception sur les deux adresses.
4. Pour les inscriptions : une feuille **« Inscriptions anciens Callo (site) »**
   est créée automatiquement dans le Google Drive du compte, avec une ligne par
   inscription.

---

## 6. Mettre à jour un script déjà installé (KPI renforcé)

Le calcul du KPI a été corrigé : il compte désormais les **visiteurs uniques**
(et non les pages vues), intègre les **messages de contact**, ignore le **trafic
de test** et la **navigation interne**, et affiche une ligne **TOTAL**.

1. Ouvrir le projet sur <https://script.google.com>.
2. Remplacer **tout** le contenu de `Code.gs` par le fichier
   <https://anciensdecallo.github.io/outils/apps-script/Code.txt> (Ctrl+A, Ctrl+C, Ctrl+V).
3. Enregistrer, puis **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**.
   L'URL `/exec` ne change pas : rien à modifier dans le site.
4. Contrôler : <https://script.google.com/macros/s/VOTRE_ID/exec?action=kpi>

**Fermer les contrôles à distance (facultatif, faible enjeu).** `?action=kpi`
et `?action=config` sont lisibles par n'importe qui. Ils ne renvoient que des
**compteurs agrégés** (aucune donnée personnelle) et les deux adresses de contact
déjà publiques sur le site : l'intérêt de les fermer est donc limité.

⚠️ **Ne jamais écrire le jeton dans ce fichier** : `Code.gs` et `Code.txt` sont
publiés sur un dépôt GitHub **public**, le mot serait visible de tous. Si vous
fermez l'accès, faites-le **uniquement dans l'éditeur Apps Script** (variable
`JETON_KPI`), **sans jamais coller le jeton ici ni le committer**. L'éditeur et
le dépôt divergent alors sur cette seule ligne : c'est normal et sans risque.

À noter : ce jeton ne protège **pas** contre un gonflement artificiel des visites
(`?action=visite` doit rester ouvert pour fonctionner depuis le navigateur). La
protection réelle contre les comptages en double, c'est le suivi par **visiteur
unique** introduit à l'étape 6.

> Les lignes déjà enregistrées avec les anciennes origines `site` et
> `site:anciensdecallo.github.io` sont désormais ignorées : le taux de
> conversion redevient juste sans rien effacer dans la feuille.

## 7. Mesure d'audience (Google Analytics 4)

- Le site **ne charge plus Google Analytics avant l'accord** du visiteur :
  `assets/js/consent.js` affiche un bandeau « Accepter / Refuser » et n'injecte
  `gtag.js` qu'en cas d'acceptation. Un refus n'envoie **aucune** requête à Google.
- Le choix est mémorisé dans le navigateur et modifiable via le lien
  « gérer mes préférences » des mentions légales.
- Trois événements de conversion sont envoyés (uniquement si accord) :
  `form_submit`, `generate_lead`, `form_error`, avec le paramètre `form`
  (`inscription` ou `contact`).
- **Pour les voir comme conversions** : dans GA4, *Admin → Événements* →
  marquer `generate_lead` comme **événement clé**. C'est une action à faire une
  fois depuis le compte Google propriétaire de la propriété `G-Z9DCCNGT00`.

---

## Bon à savoir

- **Quota d'envoi** : Google autorise environ 1 500 courriels par jour avec un
  compte Workspace (largement suffisant). Le compteur restant s'affiche à la fin
  du test de l'étape 2.
- **Après toute modification de `Code.gs`**, il faut redéployer : *Déployer* →
  *Gérer les déploiements* → ✏️ → *Version : Nouvelle version* → *Déployer*.
  L'URL `/exec` reste la même.
- **Modifier les destinataires** : soit la liste `DESTINATAIRES` dans `Code.gs`
  (puis redéployer), soit la liste `CONTACT_EMAILS` dans `assets/js/config.js`
  (qui sert aussi aux liens de contact affichés sur le site).
- **Désinscription / RGPD** : les données reçues servent uniquement à
  l'organisation de l'AG et à l'annuaire des anciens, et sont conservées 3 ans
  après le dernier contact (mention déjà présente sur les formulaires).
