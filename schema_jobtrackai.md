
# 🧱 Schéma de base de données – JobTrackAI

Ce document décrit le **modèle relationnel complet** utilisé pour le système de suivi automatisé des candidatures (JobTrackAI).  
Chaque section contient :
- une **description** de la table et de son rôle,  
- le **code SQL** pour la créer (avec contraintes, clés étrangères, et `ON DELETE CASCADE`),
- ainsi que les **triggers** utilisés pour initialiser les données.

---

## 1. Table `auth.users` (gérée par Supabase Auth)

Représente les utilisateurs de la plateforme.  
Cette table est gérée automatiquement par Supabase via le module `auth.users`.  
Elle contient les identifiants, l’e-mail, et les métadonnées d’authentification.

```sql
-- ⚠️ Gérée par Supabase, ne pas recréer manuellement
-- Table auth.users (schéma simplifié) :
-- id UUID PRIMARY KEY
-- email TEXT UNIQUE
-- created_at TIMESTAMP WITH TIME ZONE
-- ... autres colonnes spécifiques à Supabase Auth
```

---

## 2. Table `profiles`

Contient les informations supplémentaires liées à un utilisateur :
- date du dernier scan,
- photo de profil,
- lien 1–1 avec `auth.users`.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_scan_at TIMESTAMP WITH TIME ZONE NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 3. Table `mail_connections`

Représente la connexion OAuth entre un utilisateur et son fournisseur d’e-mail (Gmail / Outlook).  
Permet de stocker le jeton d’accès actualisable (`refresh_token`) de manière chiffrée côté application.

```sql
CREATE TABLE public.mail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('gmail', 'outlook')),
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 4. Table `threads`

Représente un **fil de candidature** : un regroupement logique de plusieurs e-mails (applications)  
liés à une même entreprise et un même poste.

```sql
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  current_status TEXT CHECK (current_status IN ('applied', 'in_review', 'interview', 'offer', 'rejected')),
  last_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, company, position)
);
```

---

## 5. Table `applications`

Représente un **e-mail analysé** (une étape d’une candidature).  
Chaque application appartient à un thread, et reflète un statut à un instant donné.

```sql
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  email_message_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('applied', 'in_review', 'interview', 'offer', 'rejected')),
  company TEXT,
  position TEXT,
  email_date TIMESTAMP WITH TIME ZONE,
  subject TEXT,
  snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 6. Table `notifications`

Stocke les alertes envoyées à l’utilisateur (nouveau statut, nouvelle offre, etc.).

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 7. Table `credit_transactions`

Historise toutes les opérations liées au système de points :
- bonus initial,
- achats,
- consommation par scan,
- ajustements administrateur.

```sql
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('purchase', 'scan', 'initial_bonus', 'admin_adjustment')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 8. Table `exports`

Historique des exports de données utilisateur.

```sql
CREATE TABLE public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 9. Triggers automatiques

### 9.1. Création automatique du profil utilisateur

Lorsqu’un utilisateur est ajouté à `auth.users`, on crée un `profile` correspondant.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, last_scan_at, photo_url)
  VALUES (NEW.id, NULL, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();
```

---

### 9.2. Crédits initiaux (bonus de bienvenue)

Lorsqu’un nouvel utilisateur est créé, il reçoit **3000 points** automatiquement.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.credit_transactions (user_id, amount, type)
  VALUES (NEW.id, 3000, 'initial_bonus');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_credit
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_credits();
```

---

## 10. Suppression en cascade

Toutes les clés étrangères sont définies avec `ON DELETE CASCADE`,  
ce qui garantit qu’à la suppression d’un utilisateur (`auth.users.id`),  
toutes les données associées disparaissent automatiquement :

- `profiles`  
- `mail_connections`  
- `threads`  
- `applications`  
- `notifications`  
- `credit_transactions`  
- `exports`  

Aucune opération manuelle de nettoyage n’est nécessaire côté code.

---

## 11. Résumé global

| Table                | Description                       | Dépend de      | Suppression en cascade |
|----------------------|-----------------------------------|----------------|------------------------|
| `auth.users`         | Utilisateurs Supabase             | –              | –                      |
| `profiles`           | Métadonnées utilisateur           | `auth.users`   | ✅                     |
| `mail_connections`   | Jetons OAuth Gmail/Outlook        | `auth.users`   | ✅                     |
| `threads`            | Fils de candidature               | `auth.users`   | ✅                     |
| `applications`       | E-mails analysés (statuts)        | `threads`, `auth.users` | ✅             |
| `notifications`      | Alertes utilisateur               | `threads`, `auth.users` | ✅             |
| `credit_transactions`| Historique des points             | `auth.users`   | ✅                     |
| `exports`            | Historique des exports            | `auth.users`   | ✅                     |

Ce schéma fournit une base solide pour implémenter toutes les fonctionnalités :  
authentification, connexion mail, scan, suivi des candidatures, notifications, système de points et gestion des données utilisateur.
