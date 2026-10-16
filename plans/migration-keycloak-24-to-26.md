# Plan de migration Keycloak 24.0.5 → 26.8.x

> Rédigé le 2026-10-16. Source : [guide d'upgrade Keycloak 26.8.1](https://www.keycloak.org/docs/latest/upgrading/) (sections 25.0.0 → 26.8.1).
> Analyse faite sur la branche **`b2pconnect-keycloakify-v11`** (la plus à jour : contient `main` + 5 commits de migration keycloakify v11 et l'import de la branche v10).

## Contexte

- Serveur actuel : **Keycloak 24.0.5** (capture « Server info » du realm master).
- Cible : **dernier patch 26.8.x au moment de la mise en prod** (26.8.1 au 2026-10-13). Keycloak communautaire n'a pas de LTS : seule la dernière mineure reçoit les correctifs.
- Fonctionnalités activées notables : `HOSTNAME_V1`, `JS_ADAPTER`, `ACCOUNT3`, `ADMIN2`, `WEB_AUTHN`, `KERBEROS`.
- Thème (branche `b2pconnect-keycloakify-v11`) :
  - keycloakify **épinglé à `11.8.22`** (version exacte, commit `0994009`, sans justification dans le message) ; dernière version : 11.16.3.
  - **Login** : pages et Template par défaut de keycloakify (le `Template.tsx` copié a été supprimé le 2026-10-16) ; logo B2PConnect en image de fond CSS, `main.css` (fond `#313F50`), `doMakeUserConfirmPassword = true`. Stories Storybook : `login`, `login-username`, `login-password`, `info`, `terms`, `error`.
  - **Email** : thème FTL natif (`src/email`, `parent=base`) : `template.ftl` HTML personnalisé (logo, pied de page B2PConnect) + 12 templates HTML/texte + messages en 28 langues.
  - Pas de thème account (`accountThemeImplementation: "none"`).
  - Storybook reste en **8.1** (comme le starter keycloakify officiel, décidé le 2026-10-16). `src/kc.gen.tsx` réexporte `Meta`/`StoryObj` depuis `@storybook/react-vite`, qui ne les fournit qu'à partir de Storybook 9 : dans les stories, importer ces types depuis `@storybook/react` (ce que fait `npx keycloakify add-story`), jamais depuis `kc.gen`.
  - **Nom du thème : `b2pconnect`** (décidé le 2026-10-16). Historique : `b2pconnect-k10` en v10 ; la v11 avait perdu `themeName` et produisait `keycloakify-starter`. → les realms devront sélectionner `b2pconnect` (login + email) lors de la mise en prod.
  - Aucun fournisseur d'identité externe utilisé pour le moment. Les boutons IdP ne sont plus masqués (Template de keycloakify) : si un fournisseur est ajouté, son bouton apparaîtra sur la page de login, ce qui est voulu.
  - Environnement de test : `make start-server [KC_VERSION=…] [KC_PORT=…]` (`keycloakify start-keycloak` + maildev, realm `realm/realm.json` repris de la v10 et nettoyé de ses clés et mots de passe).

## Bloquants serveur

| # | Changement | Version | Action |
|---|---|---|---|
| S1 | **Hostname v1 supprimé** (`HOSTNAME_V1` est activé chez nous) | 26.0.0 | Passer aux options hostname v2. **Non préparable en 24** (hostname v2 n'existe pas en 24.0.5) : la bascule se fait au moment de la montée de version. Points clés (section « New Hostname options », 25.0.0) : `--hostname` accepte une URL complète (schéma, port, chemin) ; `--hostname-admin` n'accepte **que** une URL complète ; `--hostname-strict-backchannel` → `--hostname-backchannel-dynamic` ; supprimées : `hostname-url`, `hostname-admin-url`, `hostname-path`, `hostname-port`, `hostname-strict-backchannel`, `hostname-strict-https`. HTTPS n'est plus imposé s'il n'est pas dans l'URL. |
| S2 | **Option `--proxy` supprimée** | 26.0.0 | Remplacer par `--proxy-headers=xforwarded\|forwarded` selon le reverse proxy. Disponible dès la 24 → préparable avant la montée. Vérifier la commande de démarrage, les variables `KC_PROXY*` et les manifests. |
| S3 | **`/js/keycloak.js` n'est plus servi** (`JS_ADAPTER` activé) | 26.0.0 | Recenser les applications qui chargent `keycloak.js` depuis le serveur. Les passer à `keycloak-js` (npm) : configuration obligatoire, `login()` / `createLoginUrl()` async, HTTPS requis. |
| S4 | Features renommées (`account3`, `admin2`, `login2` → `account`, `admin`, `login:v1/v2`) | 26.0.0 | Mettre à jour `--features` / `--features-disabled` si utilisés. |
| S5 | **Sessions : déconnexion de tous les utilisateurs + arrêt complet obligatoire** | 25.0.0 / 26.0.0 | Les sessions en mémoire de la 24 **ne peuvent pas être migrées** (montée de version majeure d'Infinispan) : **toutes** les instances doivent être arrêtées avant la montée (pas de rolling upgrade) et tous les utilisateurs seront déconnectés. Ensuite, les sessions sont persistées en base par défaut : prévoir la charge DB et adapter `cache-ispn.xml` s'il est personnalisé. Voir « Migrating user sessions during the upgrade » (25.0.0). |
| S6 | **Validation plus stricte des options de build au démarrage** | 26.0.0 | Tout changement de features / providers / options de build impose de relancer `kc.sh build` (ou de reconstruire l'image Docker optimisée). |
| S7 | **SMTP** : StartTLS strictement appliqué (26.8.1) ; nouvelle option realm « Allow UTF-8 » (26.4.0) | 26.4.0 / 26.8.1 | Vérifier le support StartTLS du serveur SMTP. Après la montée : activer « Allow UTF-8 » si le SMTP supporte SMTPUTF8, sinon vérifier qu'aucun email utilisateur n'a de caractère non-ASCII avant le `@`. |
| S8 | Index DB non créés au-delà de 300 000 lignes | plusieurs | Surveiller les logs de migration et appliquer à la main le SQL loggué. |
| S9 | Divers sécurité (X.509, IdP backchannel logout, secrets IdP masqués, mappers IdP → rôles admin) et **Kerberos** (aller-retour supplémentaire pour le login Kerberos par mot de passe ; `KERBEROS` est activé chez nous) | 26.8.0 / 26.8.1 | Relire les sections « Breaking changes » / « Notable changes » 26.8.x si ces fonctionnalités sont utilisées. |
| S10 | **Changements de parcours utilisateur** : inscription sans champ mot de passe quand « Verify Email » est actif (le mot de passe est défini après vérification) ; Configure OTP / Update Password réordonnés après Verify Email ; email marqué vérifié uniquement après une vraie vérification | 26.7.0 / 26.8.0 | Décider si l'on garde le nouveau comportement ou si l'on réactive « Always set password on register form » (option dépréciée). Prévenir le support / la doc utilisateur. |

> Le guide ne mentionne pas d'obligation de passer par des versions intermédiaires (migration DB automatique). À valider par un test sur une copie de la base de prod.

## Impact sur le thème

### Login (React / keycloakify)

Keycloakify rend ses propres pages React et embarque ses propres ressources `common` (le FTL généré redirige `resourcesCommonPath` vers `resources-common` du jar — vérifié dans keycloakify 11.16.3). Les changements de templates FTL / CSS du serveur (26.0 chemins `common`, 26.7 boutons horizontaux, 26.8 boutons IdP) **ne s'appliquent donc pas**. Aucun fournisseur d'identité n'étant configuré, aucun bouton IdP n'est affiché.

Points d'attention propres à la branche :

| # | Constat | Action |
|---|---|---|
| L1 | **`Template.tsx` éjecté → ne reçoit plus les correctifs keycloakify.** Écarts constatés vs le Template d'origine 11.16.3 : fallback `realm.displayName \|\| realm.name` pour le titre ; `requestSubmit()` + `preventDefault()` sur « Try another way » (au lieu de `submit()`). Bug en plus : trois `+` parasites (copiés d'un diff) dans le sélecteur de langue → la liste affichait `NaNNaN` au lieu des langues. | ✅ Corrigé (T2), puis **Template copié supprimé** (2026-10-16) : retour au Template de keycloakify, logo en CSS dans `src/login/main.css` → les correctifs keycloakify sont désormais reçus automatiquement. |
| L2 | **`message.summary` est injecté via `dangerouslySetInnerHTML` sans `kcSanitize`** (le Template d'origine le sanitize). Risque XSS si un message contient du contenu contrôlable. Depuis 26.5 le serveur n'envoie plus de HTML dans les messages du login. | ✅ Corrigé (T2) : `kcSanitize(message.summary)`. |
| L3 | Logo chargé depuis `https://www.b2pconnect.com/wp-content/...` (dépendance au site WordPress, aussi utilisée dans l'email). | Hors migration — à signaler : embarquer le logo dans `public/` serait plus robuste. |
| L4 | Nouveau parcours d'inscription 26.7 (S10) : `register.ftl` sans mot de passe, puis page de définition des credentials. Non couvert par les stories. | Tester register avec Verify Email actif ; ajouter une story si la page est utilisée. |
| L5 | Nouvelles pages keycloakify 11.16 (`LinkIdpAction`, `SelectOrganization`, variantes WebAuthn `useScript`). | Rendu automatiquement par `DefaultPage` avec notre Template après mise à jour de keycloakify. |

### Email (FTL natif, `parent=base`)

Ce thème est rendu **par le serveur Keycloak** : il est directement concerné par les changements serveur.

| # | Constat | Action |
|---|---|---|
| E1 | **FreeMarker passe aux défauts 2.3.32** (26.7.0). Nos templates utilisent `kcSanitize(...)?no_esc`, `<#outputformat>`, `<#nested>` — syntaxe standard, risque faible. | Envoyer chaque email (12 types × HTML + texte) sur l'environnement de test. |
| E2 | Templates copiés d'une version de base antérieure : les templates ajoutés depuis par Keycloak (ex. emails OID4VCI) retombent sur la mise en page `base` sans branding. | Comparer `src/email/html` / `text` avec `themes/base/email` de Keycloak 26.8.x ; ajouter les manquants si utilisés. |
| E3 | Messages : nouvelles clés 26.x absentes de nos `messages_*.properties` → repli sur `base` (OK). Fichiers `zh_CN` / `zh_TW` toujours reconnus (26.4.0). La règle « pas de HTML dans les messages » (26.5) concerne **uniquement le login**, pas les `*BodyHtml` des emails. | Diff des clés avec `base/email/messages` 26.8.x pour reprendre les textes nouveaux / modifiés en `fr` et `en`. |
| E4 | Repli de traduction sur la langue par défaut du realm avant l'anglais (26.5.0). | Rien à faire ; à garder en tête lors des tests multilingues. |

## Étapes

### Thème (ce dépôt, branche `b2pconnect-keycloakify-v11`)

1. ✅ **T1 — Mettre à jour keycloakify** `11.8.22` → `11.16.3` (garder l'épinglage exact si c'était voulu). Trancher le gestionnaire de paquets : `package-lock.json` **et** `yarn.lock` sont présents, la CI utilise `npm run`.
   → vérification : `npm run build` passe (type-check) ; diff de `src/kc.gen.tsx` limité au code généré.
2. ✅ **T2 — Corriger `Template.tsx`** (L1, L2).
   → vérification : `npm run build` passe ; stories `login`, `info`, `error` OK dans Storybook.
3. ✅ **T3 — Construire les jars** : `npm run build-keycloak-theme` (Maven + Java requis).
   → résultat : `keycloak-theme-for-kc-22-to-25.jar` (prod actuelle) et `keycloak-theme-for-kc-all-other-versions.jar` (Keycloak 26.x). Sans thème account, keycloakify ne produit **pas** de jar `26.2-and-above`.
4. **T4 — Tester sur 26.8.x** : `make start-server KC_VERSION=26.8.1` (emails dans maildev : http://localhost:1080).
   → vérification : login, login-username, login-password, register (avec Verify Email, L4), reset password, OTP, WebAuthn, info, terms, error ; fond et logo corrects ; chaque email (E1) reçu avec le branding.
   → 🟡 **partiel (2026-10-16, 26.8.1)** : OK pour login, erreur de mot de passe, changement de langue (fr/en), connexion réussie, emails « execute actions » et « vérification » (logo + pied de page), pages info et configuration OTP via le lien de l'email ; aucune erreur JS ni ressource en échec. Restent : register (L4), reset password, WebAuthn, terms, error, les 10 autres emails.
5. **T5 — Thème email** (E2, E3) : comparer avec `base/email` 26.8.x, compléter templates / messages si nécessaire.
   → vérification : diff documenté ; emails nouveaux brandés.
6. **T6 — Non-régression 24.0.5** (tant que la prod n'est pas migrée) : `make start-server KC_VERSION=24.0.5`.
   → vérification : même parcours OK avec le jar `22-to-25`, ou décision explicite de ne plus supporter 24.
   → ✅ **même parcours partiel que T4 OK sur 24.0.5** (2026-10-16), jar `22-to-25`.
7. **T7 — (optionnel) Restreindre les cibles** via `keycloakVersionTargets` dans `vite.config.ts` une fois la prod en 26.x.
8. **T8 — Release** : bump `version` dans `package.json` et push (la CI `ci.yaml` ne publie que depuis `main` → merger la branche dans `main` d'abord). À faire avant I5.
   La version (`0.0.0` aujourd'hui) devient aussi le `themeVersion` du jar et de `kcContext.themeVersion` (doc keycloakify) : partir d'une vraie version (ex. `1.0.0`) pour savoir quelle version du thème tourne en prod.

### Serveur (infra)

1. **I1 — Inventaire** : mode de déploiement, commande de démarrage, variables `KC_*`, reverse proxy, apps utilisant `/js/keycloak.js`, `cache-ispn.xml` personnalisé, SMTP (StartTLS, UTF-8), usage de Kerberos, realms avec auto-inscription + Verify Email.
   → vérification : liste des points S1–S10 qui s'appliquent.
2. **I2 — Préparer en 24.0.5** ce qui peut l'être : passer de `--proxy` à `--proxy-headers`, migrer les apps vers `keycloak-js` npm. (Hostname v2 : impossible en 24, cf. S1.)
   → vérification : prod 24.0.5 fonctionne sans `--proxy` et sans dépendre de `/js/keycloak.js`.
3. **I3 — Environnement de test** : copie de la base de prod + Keycloak 26.8.x + config hostname v2 + jar `all-other-versions` (issu de T3), `kc.sh build` / image reconstruite.
   → vérification : démarrage OK, migration DB sans erreur (relever le SQL d'index loggué), login sur chaque realm, inscription, OTP/WebAuthn, Kerberos si utilisé, tous les emails.
4. **I4 — Sauvegarde** complète de la base de prod + conservation de la config 24 (options hostname v1 / proxy, image ou distribution, jar `22-to-25`).
5. **I5 — Mise en production** (fenêtre de maintenance, **interruption de service**, **tous les utilisateurs déconnectés** — cf. S5) :
   1. arrêter **toutes** les instances 24.0.5 ;
   2. dans `providers/`, **retirer** le jar `22-to-25` et déposer le jar `all-other-versions` (même nom de thème → conflit si les deux sont présents) ;
   3. appliquer la config hostname v2 / `--proxy-headers` / features renommées, puis `kc.sh build` (ou déployer l'image reconstruite) ;
   4. démarrer 26.8.x (migration DB automatique) puis appliquer les index éventuels ;
   5. sélectionner le thème **`b2pconnect`** en login **et** email dans chaque realm (nouveau nom, cf. Contexte) ; régler « Allow UTF-8 » (S7) et le parcours d'inscription (S10).
   → vérification : mêmes contrôles qu'en I3 ; surveiller la charge DB (sessions persistées).
6. **I6 — Rollback** : arrêter 26.8.x, restaurer la base (I4), remettre le jar `22-to-25`, la config hostname v1 / proxy et l'image 24.0.5, redémarrer. La migration DB n'est pas réversible : seule la restauration de la sauvegarde permet le retour.

## Questions ouvertes

- Comment Keycloak est-il déployé (Docker, Operator, VM) ? Conditionne S2/S4/S6 et I5.
- Quelles applications utilisent l'adaptateur JS servi par le serveur ?
- Kerberos est-il réellement utilisé ?
- Quel nom de thème est sélectionné aujourd'hui dans les realms de prod (pour préparer la bascule vers `b2pconnect`) ?
- Pourquoi keycloakify a-t-il été épinglé à `11.8.22` ?
- Doit-on continuer à produire un jar compatible 24 après la migration ?
- Branches : `b2pconnect-keycloakify-v11` n'est pas mergée dans `main`. L'outillage de test de `b2pconnect-keycloakify-v10` (`makefile`, `realm/realm.json`, scripts) a été repris et adapté à `keycloakify start-keycloak`. L'ancienne branche `b2pconnect` contenait une personnalisation du thème **account** (« modify application page ») absente de la v11 : abandonnée volontairement ?
- Hors migration : `.github/workflows/publish.yaml` pointe vers `build_keycloak/target/*` (chemin pré-v11), utilise Node 18 (`.nvmrc` = 22) et `actions/*@v3` — le corriger ou le supprimer ?
