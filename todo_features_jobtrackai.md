# ✅ JobTrackAI – Liste des fonctionnalités à développer (version finale avec Threads)

## A. Authentification & Compte utilisateur

- [ ] Créer un compte utilisateur (via Supabase Auth)
- [ ] Se connecter / se déconnecter
- [ ] Supprimer son compte (et toutes les données associées)
- [ ] Mettre à jour ses informations de profil (fonction update fonctionnel, mais il n'y pas d'attribut a modifier pour l'instant, le tableau est minimal)
- [ ] Enregistrer des métadonnées supplémentaires (date du dernier scan, etc.)
      ➡️ **Tables :** `users`, `profiles`

---

## B. Connexion à la boîte mail

- [ ] Connecter sa boîte mail (OAuth Gmail ou Outlook)
- [ ] Vérifier l’état de la connexion (valide / expirée)
- [ ] Rafraîchir automatiquement (sans intervention de l'utilisateur) l'access tokens d’accès si expirés
- [ ] Révoquer l’accès à la boîte mail
- [ ] Supprimer la connexion (la ligne mail connection) si le refresh token devient invalide
      ➡️ **Tables :** `mail_connections`

---

## C. Scan & Analyse automatique

- [ ] Lancer un scan initial (3 dernier jours)
- [ ] Lancer un scan incrémental (nouveaux e-mails depuis la dernière date connue)
- [ ] Extraire les informations clés depuis les e-mails
  - [ ] Nom de l’entreprise
  - [ ] Titre du poste
  - [ ] Statut détecté
  - [ ] Date du message
  - [ ] Identifiant unique (`email_message_id`)
- [ ] Identifier le thread correspondant
  - [ ] S’il existe déjà → rattacher l’e-mail
  - [ ] Sinon → créer un nouveau thread
- [ ] Créer automatiquement une **application** à partir de l’e-mail
- [ ] Mettre à jour le statut d’une candidature existante
- [ ] Conserver l’historique complet des statuts (timeline par thread)
- [ ] Lister les scans effectués par utilisateur
      ➡️ **Tables :** `applications`, `threads`, `mail_connections`, `profiles`

---

## D. Gestion des candidatures

- [ ] Créer une candidature manuellement
- [ ] Lire la liste des candidatures (toutes ou par thread)
- [ ] Lire les détails d’une candidature (contenu, date, source mail)
- [ ] Mettre à jour une candidature (titre, entreprise, statut)
- [ ] Supprimer une candidature
- [ ] Filtrer / trier les candidatures (par statut, entreprise, date)
- [ ] Voir l’évolution d’un thread (fil chronologique)
      ➡️ **Tables :** `applications`, `threads`

---

## E. Tableau de bord

- [ ] Afficher la liste complète des candidatures regroupées par thread
- [ ] Afficher les statistiques globales (nombre par statut, nombre de threads actifs)
- [ ] Rechercher une candidature ou une entreprise
- [ ] Afficher les dernières mises à jour
- [ ] Gérer le mode sombre / clair
      ➡️ **Tables :** `applications`, `threads`, `profiles`

---

## F. Notifications

- [ ] Recevoir une notification lors d’un changement de statut
- [ ] Recevoir une notification lorsqu’un nouveau mail est ajouté à un thread
- [ ] Marquer une notification comme lue / non lue
- [ ] Gérer les préférences de notifications (activer/désactiver)
- [ ] Consulter l’historique des notifications
      ➡️ **Tables :** `notifications`, `threads`

---

## G. Système de crédits (points)

- [ ] Afficher le solde de points
- [ ] Déduire des points à chaque scan effectué
- [ ] Empêcher un scan si solde insuffisant
- [ ] Acheter des points via Stripe
- [ ] Mettre à jour le solde après paiement réussi
- [ ] Lister l’historique des transactions
- [ ] Ajuster le solde manuellement (admin)
      ➡️ **Tables :** `credit_transactions`

---

## H. Export & suppression des données

- [ ] Exporter toutes les données utilisateur (JSON)
- [ ] Supprimer définitivement toutes les données associées
  - [ ] Profil
  - [ ] Connexion mail
  - [ ] Applications
  - [ ] Threads
  - [ ] Transactions
  - [ ] Notifications
        ➡️ **Tables :** `exports`, `users`, `profiles`, `applications`, `threads`, `notifications`, `credit_transactions`
