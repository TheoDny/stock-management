# Stock Management

Application web de gestion de stock multi-entites (utilisateurs, roles/permissions, tags, caracteristiques, materiels, historiques, logs).

## Stack technique

- `Next.js` (App Router) + `React 19` + `TypeScript`
- `Prisma` + `PostgreSQL`
- `better-auth` pour l'authentification
- `next-safe-action` pour les server actions typees
- `next-intl` pour l'i18n (`fr`, `en`)
- `shadcn/ui` + `Tailwind CSS`

## Architecture du projet

L'application suit une architecture en couches, orientee "UI -> Action -> Service -> Data", afin de separer clairement:

- la presentation (React/Next),
- le controle d'acces et la validation,
- la logique metier,
- l'acces aux donnees.

### 1) Couche App Router (`app/`)

Responsabilites:

- definir les routes de pages et les layouts,
- structurer les zones fonctionnelles,
- exposer les endpoints techniques via `app/api`.

Organisation:

- `app/(auth)/`: parcours d'authentification (sign-in, sign-up, reset/forgot password),
- `app/(app)/`: application connectee (administration, configuration, compte, materiels),
- `app/api/`: routes serveur techniques:
  - `auth`: integration Better Auth,
  - `image/[imageId]` et `image/path/[...path]`: lecture de fichiers/images,
  - `cron/reset-database`: endpoint cron protege par secret.

Regle:

- le code de `app/` reste leger: orchestration de page/layout et rendu de composants.
- la logique metier ne doit pas etre implantee directement dans les pages.

### 2) Couche UI (`components/`)

Responsabilites:

- afficher les donnees,
- gerer l'etat de formulaire et les interactions utilisateur,
- appeler les actions serveur.

Caracteristiques:

- composants metier par domaine (`user-management`, `role-management`, `material-management`, etc.),
- composants UI reutilisables dans `components/ui` (shadcn/ui),
- i18n via `next-intl` (messages `fr` et `en`).

Regle:

- un composant ne doit pas contenir de logique d'acces base de donnees.
- il declenche une action puis met a jour son etat local selon le resultat.

### 3) Couche Actions (`actions/`)

Responsabilites:

- point d'entree serveur pour les operations metier depuis l'UI,
- validation des entrees (Zod / next-safe-action),
- controle d'acces avec `checkAuth` et permissions requises,
- delegation vers les services.

Concretement, une action:

1. valide `parsedInput`,
2. verifie l'authentification,
3. verifie la permission metier (`user_edit`, `role_edit`, `material_create`, etc.),
4. appelle le service adapte,
5. renvoie un resultat exploitable cote UI.

Regle:

- pas de logique metier complexe dans `actions/`.
- les actions restent fines et predictibles.

### 4) Couche Services (`services/`)

Responsabilites:

- centraliser la logique metier,
- lire/ecrire en base via Prisma,
- orchestrer les operations multi-etapes (transactions, historique, logs, storage),
- gerer le cache serveur Next.js (`use cache`, `cacheTag`, `revalidateTag`) pour les lectures frequentes,
- encapsuler les regles de domaine.

Exemples de services:

- `user.service.ts`: cycle de vie utilisateur, roles, entites, signup invite,
- `role.service.ts`: gestion role/permissions,
- `material.service.ts`: creation/mise a jour materiel + caracteristiques,
- `material-history.service.ts`: snapshots d'historique,
- `log.service.ts`: journalisation metier,
- `storage.service.ts`: gestion des fichiers avec contraintes de securite,
- `auth.service.ts`: resolution roles/permissions/entities pour la session.

Regles:

- le service est la source de verite metier.
- les operations multi-writes critiques doivent etre transactionnelles (`prisma.$transaction`).

### 5) Couche Data et Infrastructure (`lib/` + `prisma/`)

`lib/`:

- `lib/prisma.ts`: client Prisma (singleton) + configuration connexion,
- `lib/auth.ts`: configuration Better Auth + enrichissement de session,
- utilitaires techniques (`lib/utils*`).

`prisma/`:

- `schema.prisma`: modele de donnees (User, Role, Permission, Entity, Material, etc.),
- `migrations/`: evolution schema,
- `seed.ts` + fichiers associes: bootstrap initial (permissions, super admin, etc.).

Regle:

- tout acces SQL passe par Prisma.
- pas de requetes SQL ad hoc dispersees dans les composants/actions.

### 6) Types, erreurs et contrats (`types/`, `errors/`)

`types/`:

- types applicatifs partages entre couches,
- contrats de payloads et structures metier.

`errors/`:

- erreurs de domaine explicites (`NotFoundMaterialError`, `DeleteRoleUserAssignedError`, etc.),
- facilite le mapping vers des messages UI propres.

Regle:

- preferer des erreurs metier nommees plutot que `throw new Error("...")` generique.

### 7) Flux applicatifs de reference

#### Flux standard (lecture/ecriture metier)

`Component -> Action -> checkAuth/validation -> Service -> Prisma -> Action -> Component`

#### Flux avec effets secondaires

`Component -> Action -> Service -> Prisma -> history/log/storage -> (revalidateTag/cacheTag/revalidatePath) -> Component refresh`

Exemple simplifie (materiel):

1. l'UI envoie un formulaire de creation/mise a jour,
2. l'action valide les donnees et la permission,
3. le service persiste le materiel et ses caracteristiques,
4. le service met a jour l'historique + logs,
5. l'action revalide la route pour rafraichir les donnees cote UI.

### 8) Conventions d'architecture a respecter

- **Single responsibility**: chaque couche a un role clair.
- **Direct DB only in Service**: Appelle a la base de donnée uniquement dans les fichier `xxxxx.service.ts`
- **Auth centralisee**: verification via `checkAuth` dans les actions.
- **Observabilite**: journaliser les actions d'administration importantes.
- **Securite fichiers**: toujours valider/normaliser les paths non fiables.
- **I18n**: toute nouvelle feature visible utilisateur doit etre traduite (`fr`/`en`).

## Fonctionnalites principales

- Gestion des utilisateurs (creation, edition, desactivation)
- Gestion des roles et permissions
  - matrice module x action (ex: `user_read`, `material_edit`)
  - regle UI: cocher `create/edit` coche automatiquement `read`
- Gestion des tags et caracteristiques
- Gestion des materiels avec historique
- Journalisation des actions d'administration
- Authentification locale email/mot de passe + reset password
- Stockage de fichiers (optionnel) via `STORAGE_PATH`

## Installation

1. Installer les dependances

```bash
pnpm install
```

1. Creer le fichier d'environnement

```bash
cp .env.example .env
```

1. Demarrer PostgreSQL (option Docker)

```bash
pnpm docker:up
```

1. Generer Prisma et appliquer les migrations

```bash
pnpm prisma:generate
pnpm prisma:deploy
```

1. Seeder la base

```bash
pnpm prisma:seed
```

1. Lancer l'application

```bash
pnpm dev
```

Application disponible sur `http://localhost:3000`.

## Variables d'environnement

Copier `.env.example` et adapter les valeurs.

Variables importantes:

- App
  - `NEXT_PUBLIC_NAME_APP`
  - `NEXT_PUBLIC_APP_URL`
- Auth
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `JWT_SECRET`
- Base de donnees
  - `DATABASE_URL` ou (`DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`)
- Mail
  - `MAIL_EMAIL_USER`
  - `MAIL_EMAIL_PASSWORD`
  - `MAIL_HOST`
  - `MAIL_PORT`
  - `MAIL_SECURE`
  - `MAILER_ACTIVE` (optionnel)
- Fichiers
  - `STORAGE_PATH`
  - `NEXT_PUBLIC_STORAGE_ENABLED` (`"true"`/`"false"`)
- Autres
  - `CRON_SECRET`
  - `NEXT_PUBLIC_MAX_USER` (optionnel)
  - `NEXT_PUBLIC_MAX_ROLE` (optionnel)

## Scripts utiles

- `pnpm dev`: demarrage en developpement
- `pnpm build`: build production
- `pnpm start`: demarrage du build
- `pnpm lint`: lint ESLint
- `pnpm prettier`: formatage
- `pnpm prettier:check`: verification formatage
- `pnpm prisma:generate`: generation client Prisma
- `pnpm prisma:deploy`: applique migrations
- `pnpm prisma:migrate`: cree une migration locale
- `pnpm prisma:seed`: seed donnees
- `pnpm prisma:reset`: reset base locale
- `pnpm prisma:studio`: UI Prisma
- `pnpm docker:up` / `pnpm docker:down`: gestion du conteneur PostgreSQL

## API routes exposees

- `app/api/auth/[...all]/route.ts`: endpoints Better Auth
- `app/api/image/[imageId]/route.ts`: lecture image par identifiant
- `app/api/image/path/[...path]/route.ts`: lecture fichier par chemin relatif securise
- `app/api/cron/reset-database/route.ts`: endpoint cron protege par `CRON_SECRET`

## Qualite et validation

- Lint: `pnpm lint`
- Type check: `pnpm exec tsc --noEmit`
- Format: `pnpm prettier:check`

## Notes securite

- La seed contient un compte Super Admin de bootstrap dans `prisma/data-seed.ts`.
- Changer les credentials et secrets en dehors des environnements locaux.
- Ne jamais commiter de secrets reels dans le depot.

## Deploiement

Le script `vercel-build` est prevu pour un pipeline type Vercel:

```bash
pnpm vercel-build
```

Il execute:

1. `prisma migrate deploy`
2. `prisma generate`
3. `prisma db seed`
4. `next build`

