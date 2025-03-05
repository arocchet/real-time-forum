# Real-Time-Forum

**Version 1.0**

👋 Bienvenue à la documentation de Real Time Forum, un forum en temps réel développé en Go et JavaScript. Ce document fournit une description complète du projet, incluant l'architecture, la configuration, l'utilisation, le dépannage et la maintenance.


## Table des Matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture technique](#2-architecture-technique)
    * [Diagramme d'architecture](#diagramme-darchitecture)
    * [Modèle de données](#modèle-de-données)
3. [Instructions de configuration](#3-instructions-de-configuration)
    * [Prérequis](#prerequisites)
    * [Installation](#installation)
    * [Configuration de la base de données](#configuration-de-la-base-de-données)
4. [Dépendances et prérequis](#4-dépendances-et-préréquis)
5. [Configuration](#5-configuration)
6. [Documentation de l'API](#6-documentation-de-lapi)
    * [API Utilisateurs](#api-utilisateurs)
    * [API Sessions](#api-sessions)
    * [API Posts](#api-posts)
    * [API Commentaires](#api-commentaires)
    * [API Catégories](#api-catégories)
    * [API Messages Privés](#api-messages-privés)
7. [Cas d'utilisation courants](#7-cas-dutilisation-courants)
8. [Guide de dépannage](#8-guide-de-dépannage)
9. [Considérations de sécurité](#9-considérations-de-sécurité)
10. [Optimisations de performance](#10-optimisations-de-performance)
11. [Lignes directrices pour les tests](#11-lignes-directrices-pour-les-tests)
12. [Processus de déploiement](#12-processus-de-déploiement)
13. [Procédures de maintenance](#13-procédures-de-maintenance)
14. [Informations de contact et contributions](#14-informations-de-contact-et-contributions)


## 1. Vue d'ensemble du projet

Real Time forum est un forum en ligne permettant aux utilisateurs de créer des posts, de commenter, d'envoyer des messages privés et d'interagir en temps réel grâce à la technologie WebSocket.  Le projet est développé en Go pour le backend et en JavaScript pour le frontend. Il utilise une base de données SQLite pour le stockage persistant des données.  L'objectif principal est de fournir une plateforme interactive et conviviale pour la discussion et le partage d'informations.


## 2. Architecture technique

Real Time forum adopte une architecture client-serveur avec une séparation claire entre le frontend (JavaScript) et le backend (Go).  Le backend expose une API RESTful pour gérer les données et le frontend utilise cette API pour interagir avec le serveur.  Les communications en temps réel sont gérées par WebSocket.

### Diagramme d'architecture
![Wireframe](/assets/img/wireframe.png)

### Modèle de données
![Shema DB](/assets/img//DBshem.png)



## 3. Instructions de configuration

### Prérequis

* Go 1.24.0 ou supérieur [https://go.dev/dl/](https://go.dev/dl/)
* Node.js et npm [https://nodejs.org/](https://nodejs.org/)
* Git [https://git-scm.com/downloads](https://git-scm.com/downloads)

### Installation

1. Cloner le dépôt Git : `git clone <URL_DU_DEPOT>`
2. Naviguer vers le répertoire du projet : `cd real-time-forum`
3. Installer les dépendances Go : `go mod download`
4. Installer les dépendances Node.js : `npm install`

### Configuration de la base de données

Le projet utilise une base de données SQLite.  La base de données `database.db` est créée automatiquement lors de l'initialisation du serveur.  Aucune configuration supplémentaire n'est nécessaire.


## 4. Dépendances et prérequis

Le projet utilise les dépendances suivantes :

* **Go:** `go-sqlite3`, `gofrs/uuid`, `gorilla/websocket`, `golang.org/x/crypto`
* **Node.js:**  Dépendances listées dans `package.json`


## 5. Configuration

La configuration du serveur est gérée via des variables d'environnement.  Par exemple :

* `PORT`: Port d'écoute du serveur (par défaut 8080)


## 6. Documentation de l'API

### API Utilisateurs

`/api/users` :  Permet de gérer les utilisateurs.  

* **POST `/api/users`**: Crée un nouvel utilisateur.  Requiert un JSON avec `email`, `password`, `username`.
* **GET `/api/users`**: Récupère tous les utilisateurs.

```go
//Exemple de création d'un utilisateur (API Users)
func Post(w http.ResponseWriter, r *http.Request) {
	// ... code pour gérer la requête POST ...
}
```

### API Sessions

`/api/sessions`: Gère les sessions utilisateur.

* **POST `/api/sessions`**: Crée une nouvelle session. Requiert un JSON avec `user_id` et un UUID de session.
* **GET `/api/sessions`**: Récupère les détails de la session courante.
* **DELETE `/api/sessions`**: Supprime la session courante.

```go
// Exemple de gestion de session (API Sessions)
func Post(w http.ResponseWriter, r *http.Request) {
	// ... code pour gérer la requête POST ...
        // ... générer un UUID et créer une session dans la base de données...
	http.SetCookie(w, &http.Cookie{
		Name:  "session_id",
		Value: sessionID,
                // ... autres options de cookie ...
	})
}

```


**(Les autres sections de la documentation de l'API suivront le même format pour les API Posts, Commentaires, Catégories et Messages Privés.)**


## 7. Cas d'utilisation courants

* **Création d'un post:**  L'utilisateur remplit un formulaire, soumet le post via l'API, et le post apparaît sur la page principale.
* **Envoi d'un message privé:** L'utilisateur sélectionne un destinataire, tape son message, et le message est envoyé en temps réel via WebSocket.
* **Changement de thème:**  L'utilisateur clique sur un bouton pour basculer entre le mode clair et le mode sombre.


## 8. Guide de dépannage

* **Erreur de connexion à la base de données:** Vérifier la configuration de la base de données et les droits d'accès.
* **Erreur de communication WebSocket:** Vérifier la connexion internet et le serveur WebSocket.
* **Erreur de requête API:**  Vérifier le format des données envoyées et les codes d'erreur retournés par l'API.


## 9. Considérations de sécurité

* **Mot de passe:** Les mots de passe sont hachés avec bcrypt avant d'être stockés dans la base de données.
* **Validation des entrées:**  Validation des entrées utilisateur pour prévenir les injections SQL et XSS.
* **Gestion des sessions:**  Utilisation de sessions sécurisées avec des cookies HTTPOnly et Secure.


## 10. Optimisations de performance

* **Mise en cache:**  Mise en cache des données fréquemment accédées.
* **Optimisation des requêtes SQL:**  Utilisation d'index et optimisation des requêtes.
* **Minification et compression du code:**  Réduction de la taille des fichiers JavaScript et CSS.


## 11. Lignes directrices pour les tests

* Tests unitaires pour chaque fonction.
* Tests d'intégration pour vérifier l'interaction entre les différents composants.
* Tests d'acceptation pour valider les fonctionnalités du système.


## 12. Processus de déploiement

Le déploiement se fera via [Méthode de déploiement à spécifier].


## 13. Procédures de maintenance

* **Sauvegardes régulières de la base de données.**
* **Surveillance des performances du serveur et de la base de données.**
* **Mise à jour régulière des dépendances.**
* **Application de correctifs de sécurité.**


## 14. Informations de contact et contributions

ClemNTTS & Arocchet