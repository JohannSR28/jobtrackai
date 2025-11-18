# 💼 JobTrackAI

> **JobTrackAI** est une application SaaS qui automatise le suivi de vos candidatures à partir de vos e-mails Gmail ou Outlook.  
> Elle analyse, classe et met à jour vos candidatures automatiquement pour vous offrir un tableau de bord clair, des statistiques utiles et un système de points pour gérer vos scans.

---

## 🚀 Mission

JobTrackAI simplifie la recherche d’emploi en supprimant la charge mentale du suivi.  
L’objectif : vous aider à **garder le contrôle** sur vos candidatures, sans avoir à vérifier votre boîte mail chaque jour.

---

## ⚙️ Fonctionnalités principales

### Authentification & Profil

- Connexion / inscription via Supabase Auth
- Profil utilisateur avec date du dernier scan
- Suppression complète du compte

### Connexion à la boîte mail

- Connexion OAuth Gmail / Outlook
- Rafraîchissement et révocation automatique des accès

### Scan & Analyse

- Scan initial et incrémental des e-mails
- Détection automatique du statut de candidature
- Regroupement par entreprise et poste (Threads)
- Historique complet de l’évolution des statuts

### Gestion & Tableau de bord

- Liste et détail des candidatures
- Statistiques globales
- Filtrage et recherche intelligente

### Notifications & Crédits

- Notifications lors d’un changement de statut
- Système de crédits pour gérer les scans
- Paiement Stripe pour recharger les points

### Export & Suppression

- Export JSON de toutes vos données
- Suppression automatique en cascade

---

## 🧠 Stack technique

- **Frontend :** Next.js 14 (React + TypeScript)
- **Backend :** API Routes (App Router)
- **Base de données :** Supabase (PostgreSQL)
- **Auth :** Supabase Auth (email / OAuth)
- **Mail :** Gmail API & Microsoft Graph API
- **Paiements :** Stripe Checkout
- **UI :** TailwindCSS + shadcn/ui

> 💡 L’architecture interne (services, repositories, hooks) évolue encore.  
> Une documentation technique séparée (`schema_jobtrackai.md`) contient la structure SQL complète.

---

## 🗺️ Roadmap

> 🔲 = à faire ✅ = terminé

- [ ] Authentification (Supabase)
- [ ] Connexion Gmail / Outlook
- [ ] Scan initial des e-mails
- [ ] Création automatique de threads
- [ ] Historique et dashboard
- [ ] Notifications
- [ ] Système de crédits + Stripe
- [ ] Export et suppression des données

---

## 🧭 Philosophie

- **Automatiser sans compliquer.**
- **Protéger les données utilisateur.**
- **Donner une vision claire de la progression.**

Chaque décision de conception (du schéma SQL à l’UI) vise la **simplicité, la fiabilité et la clarté**.

---

## 🧩 Installation (en local)

```bash
git clone https://github.com/JohannSR28/jobtrackai.git
cd jobtrackai
npm install
npm run dev
```
