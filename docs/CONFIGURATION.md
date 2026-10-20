# Configuration d'Open declic

Ce document ne contient aucun secret. L'application n'utilise que des valeurs **publiques** : l'URL Supabase et la clé publiable. Les droits sont garantis par les règles RLS de la base. Aucune clé secrète n'est nécessaire au fonctionnement de l'application.

## 1. Développement local

Prérequis : Node.js 20.9 ou plus récent, et Docker.

```bash
npm install
npx supabase start            # base, authentification, stockage et boîte e-mail de test (Mailpit)
npm run seed:build            # régénère supabase/seed.sql depuis content/demo-fiches.json
npx supabase db reset         # applique les migrations et les fiches de démonstration
cp .env.example .env.local    # puis renseigner les valeurs affichées par `npx supabase status`
npm run dev                   # http://127.0.0.1:3000
```

Les e-mails de confirmation sont visibles dans Mailpit, à l'adresse indiquée par `npx supabase status` (`MAILPIT_URL`, en général http://127.0.0.1:54324).

> Si le registre d'images par défaut est inaccessible, lancez Supabase avec `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`.

## 2. Premier administrateur

Il n'existe aucun moyen de devenir administrateur depuis l'interface. Pour promouvoir un compte :

1. Créez le compte normalement (inscription, puis confirmation de l'e-mail).
2. Exécutez dans l'éditeur SQL de Supabase (ou avec `psql`) :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'gooroosapio@gmail.com'
on conflict (user_id) do nothing;
```

Pour retirer ce rôle : `delete from public.user_roles where user_id = (select id from auth.users where email = '…');`

## 3. Accès complet

Le paiement en ligne n'est **pas activé**. Un administrateur attribue ou révoque l'accès complet dans **Administration › Accès**. Chaque opération (qui, quand, pour quel compte, avec quelle note) est enregistrée dans `public.access_audit` et affichée dans le journal.

Un utilisateur ne peut pas s'attribuer l'accès lui-même, à deux niveaux :
- la table `full_access` n'accepte aucune écriture directe ;
- la fonction `admin_set_full_access` vérifie le rôle administrateur.

## 4. Projet Supabase en ligne (à faire par vous)

1. Créez un projet sur https://supabase.com (une offre gratuite existe ; vérifiez ses limites).
2. Appliquez les migrations : `npx supabase link --project-ref <référence>` puis `npx supabase db push`. Vous pouvez aussi exécuter les fichiers de `supabase/migrations/` dans l'ordre, depuis l'éditeur SQL.
3. N'exécutez **pas** `seed.sql` en production. Importez plutôt les fiches depuis l'administration (le fichier `content/demo-fiches.json` peut servir de test ; les fiches arrivent en brouillon).
4. **Authentication › Providers › Email** : activez « Confirm email ».
5. **Authentication › URL Configuration** :
   - Site URL : l'URL publique de l'application.
   - Redirect URLs : `https://<votre-domaine>/auth/confirm`.
6. Par défaut, l'envoi d'e-mails de Supabase est très limité. Configurez un SMTP (Authentication › Emails › SMTP Settings) avant d'ouvrir les inscriptions au public.
7. Promouvez le premier administrateur (section 2).

## 5. Variables d'environnement

| Variable | Où la trouver | Publique ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API | Oui |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase › Project Settings › API Keys (clé `sb_publishable_…`) | Oui |
| `NEXT_PUBLIC_SITE_URL` | URL publique de l'application | Oui |

Ne déclarez jamais la clé secrète (`sb_secret_…`) ni la clé `service_role` dans l'application.

## 6. Déploiement Vercel (non effectué)

Aucun déploiement n'a été réalisé. Quand vous le déciderez :

1. Importez le dépôt GitHub dans Vercel. Le framework Next.js est détecté automatiquement.
2. Déclarez les trois variables de la section 5.
3. Déployez d'abord une préversion, puis testez les parcours sur téléphone.
4. Ajoutez l'URL Vercel dans les Redirect URLs de Supabase.

L'offre Hobby de Vercel est réservée à un usage personnel non commercial. Une activité commerciale nécessite une offre adaptée : vérifiez les conditions en vigueur.

## 7. Visuels

Les visuels importés depuis l'administration sont stockés dans le bucket public `visuels`. Le bucket est créé par la migration. Seuls les administrateurs peuvent y écrire. Taille maximale : 4 Mo (PNG, JPEG, WebP).

Les assets du kit visuel V1 se trouvent dans `public/assets/open-declic/`.
