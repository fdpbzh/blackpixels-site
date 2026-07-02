# Contrats en ligne — Black Pixels

Système de contrat 100 % en ligne : vous créez le contrat, vous envoyez un lien,
les mariés remplissent, signent et téléchargent le PDF. Tout est enregistré automatiquement.

## Mise en ligne (une seule fois)

1. Copiez ce dossier `site-contrat/` dans votre dépôt GitHub (vous pouvez le renommer, ex. `contrat/`).
2. Poussez (`git add . && git commit && git push`) — Cloudflare Pages déploie automatiquement.
3. Ouvrez `https://votre-site/site-contrat/admin.html`, choisissez un mot de passe
   et cliquez « Créer mon compte » (email : blackpixels.fr@gmail.com).
4. Confirmez via le lien reçu par email, puis connectez-vous. C'est prêt.

## Utilisation au quotidien

1. **admin.html** → « Nouveau contrat » : date du mariage, forfait, prix
   (acompte/solde calculés automatiquement) → « Créer le contrat ».
2. Copiez le lien affiché (ou « Ouvrir un email pré-rempli ») et envoyez-le aux mariés.
3. Les mariés ouvrent le lien (mobile ou ordinateur), lisent le contrat,
   remplissent leurs infos, signent au doigt, valident → le PDF se télécharge chez eux.
4. Dans votre tableau de suivi, le contrat passe en **Signé** — bouton **PDF** pour
   télécharger votre exemplaire à tout moment.

## Fichiers

| Fichier | Rôle |
|---|---|
| `admin.html` | Votre espace : création + suivi des contrats (protégé par mot de passe) |
| `index.html` | Page des mariés (accessible uniquement avec le lien secret) |
| `modele.pdf` | Le modèle de contrat (celui du dossier Contrats) |
| `pdf-contrat.js` | Génération du PDF signé dans le navigateur |
| `config.js` | Connexion à la base Supabase |
| `logo.png` | Logo Black Pixels |

## Sécurité

- Les données sont stockées sur Supabase (projet `black-pixels-contrats`, hébergé à Paris, gratuit).
- Chaque contrat a un lien secret unique ; sans ce lien, personne ne peut le lire.
- Personne ne peut lister les contrats : seul votre compte (blackpixels.fr@gmail.com) y a accès.
- Un contrat signé ne peut plus être modifié (re-signature refusée par la base).
- La signature enregistre un horodatage, inscrit dans le PDF.

## Pour modifier le contrat type

Le texte des articles apparaît à deux endroits : dans `modele.pdf` (le PDF final)
et dans `index.html` (l'affichage en ligne pour les mariés). Demandez à Claude de
régénérer les deux si vous changez les articles.
