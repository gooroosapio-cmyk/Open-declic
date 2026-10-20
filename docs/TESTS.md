# Bilan des tests — 20 octobre 2026

Tous les tests ci-dessous ont été **réellement exécutés** :
- avec la base Supabase locale (Docker) ;
- sur la version de production (`npm run build` puis `npm run start`) ;
- dans Chromium, avec deux profils : téléphone (Pixel 7, 412 px) et ordinateur.

| Suite | Commande | Résultat |
|---|---|---|
| Types et lint | `npm run typecheck && npm run lint` | OK |
| Build de production | `npm run build` | OK |
| Unitaires | `npm test` | 21 / 21 |
| Base de données (RLS, accès, import) | `npm run test:integration` | 21 / 21 |
| Bout en bout + accessibilité | `npm run test:e2e` | 17 / 17 |

## Couverture

**Parcours principal** (téléphone et ordinateur) : catalogue → filtres (gratuit, budget, effacer) → fiche → favori (persistant après rechargement) → comparaison (3 maximum, 4ᵉ refusée avec message, retrait) → démarrage du kit → copie des deux variantes (texte vérifié dans le presse-papiers) → validation manuelle d'une étape → rechargement → déconnexion et reconnexion → Mes kits et Mes projets. Le test vérifie aussi l'absence de défilement horizontal sur 5 pages.

**Accès**
- Visiteur : le kit gratuit est lisible. Le kit réservé affiche l'offre, sans aucun bouton de paiement, et le HTML renvoyé ne contient aucune mission ni aucun prompt réservé.
- Utilisateur gratuit : contenu réservé refusé ; `/admin` renvoie 404.
- Après attribution par un administrateur (avec note visible dans le journal), le même compte lit le kit réservé.

**Base de données** (accès direct par l'API, sans passer par l'interface)
- Un visiteur ne lit aucune étape ni aucun kit réservé, seulement le plan public (titres).
- Un utilisateur gratuit ne peut pas :
  - valider une étape réservée ;
  - s'attribuer l'accès complet ou le rôle admin (fonction et écriture directe refusées) ;
  - modifier une fiche ;
  - lire les données d'un autre compte ;
  - lister les comptes ou lire le journal.
- Membre complet : lecture du contenu réservé, mais pas des brouillons.
- Administrateur : attribution puis révocation, double attribution refusée, journal exact (action, note, auteur). La révocation retire l'accès et conserve la progression.

**Import**
- JSON illisible : message clair.
- Fiche invalide : erreurs avec fiche et champ (`resume`, `categorie`), rien n'est enregistré.
- Import valide : fiche créée en brouillon, invisible du public (404).
- Import répété : « Inchangée », aucun doublon.
- Mise à jour : titre modifié ; statut et réglage gratuit conservés ; étape absente conservée ; progression intacte.
- Un non-administrateur est refusé.
- Publication depuis l'administration : la fiche devient visible (200).
- Visuel : envoi avec texte alternatif, fichier accessible publiquement, puis retrait de la fiche.
- Édition refusée par la validation : la saisie est conservée, puis l'enregistrement réussit.

**États**
- Inscription avec confirmation réelle par e-mail (lien récupéré dans Mailpit) ; connexion refusée avant confirmation.
- Échec réseau pendant une validation : message d'erreur, aucune fausse confirmation, progression inchangée après rechargement.
- Copie impossible (presse-papiers refusé) : texte sélectionné et instructions de copie manuelle.
- Aucun résultat dans le catalogue.
- « Aide-moi à choisir » : explications par carte, filtres préremplis et modifiables.

**Accessibilité** : audit axe-core WCAG 2.1 A/AA sans violation sur 17 pages (publiques, connectées, administration), lien d'évitement au clavier. Les contrastes ont été corrigés pendant l'audit.

**Unitaires**
- Validation du schéma : version, champs inconnus, crochets dans les prompts, doublons, catégorie, montants inconnus.
- Filtres déterministes : montant inconnu jamais compté comme 0, matériel, explications, aller-retour URL, tri.
- Prompts : déterminisme, deux variantes, aucun champ à remplacer, règles obligatoires présentes.

## Non testé ou hors périmètre

- Navigateurs Safari et Firefox, et vrais téléphones : seul Chromium a été utilisé, avec émulation mobile.
- Projet Supabase en ligne et déploiement Vercel : non créés (pas d'autorisation).
- Envoi d'e-mails réels : seule la boîte de test locale a été utilisée.
- Lecteurs d'écran : aucun test manuel avec VoiceOver ou TalkBack.
- Retrait d'un visuel : l'image est retirée de la fiche, mais le fichier reste dans le stockage (pas de suppression automatique).
