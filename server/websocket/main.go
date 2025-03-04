package websocket

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Structure pour stocker les connexions des utilisateurs
type Client struct {
	SessionID     string // ID de session
	UserID        string // ID de l'utilisateur (pour persistance)
	Conn          *websocket.Conn
	Send          chan Message
	CurrentChatID string // ID de la conversation actuellement ouverte (user_id)
	once          sync.Once
}

// Gestion des connexions WebSocket
var clients = make(map[string]*Client) // La clé est maintenant l'ID de session
var clientsMutex = sync.Mutex{}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Structure du message
type Message struct {
	ID         int    `json:"id"`
	SenderID   string `json:"sender_id"`   // user_id de l'expéditeur
	ReceiverID string `json:"receiver_id"` // user_id du destinataire
	Content    string `json:"content"`
	Date       string `json:"date"`
	IsNew      bool   `json:"is_new,omitempty"`   // Pour indiquer une notification
	Username   string `json:"username,omitempty"` // Nom de l'expéditeur
}

// Base de données globale
var DB *sql.DB

// HandleConnections gère une nouvelle connexion WebSocket
func HandleConnections(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	DB = db
	sessionID := r.URL.Query().Get("uuid")
	if sessionID == "" {
		http.Error(w, "UUID de session requis", http.StatusBadRequest)
		return
	}

	// Récupérer l'ID utilisateur depuis la table des sessions
	var userID string
	err := db.QueryRow("SELECT user_id FROM sessions WHERE id = ?", sessionID).Scan(&userID)
	if err != nil {
		http.Error(w, "Session invalide", http.StatusUnauthorized)
		log.Println("Erreur de récupération de l'ID utilisateur:", err)
		return
	}

	// Upgrade de la connexion HTTP en WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Erreur WebSocket:", err)
		return
	}

	client := &Client{
		SessionID:     sessionID,
		UserID:        userID,
		Conn:          conn,
		Send:          make(chan Message),
		CurrentChatID: "",
		once:          sync.Once{},
	}

	// Ajouter le client à la liste avec l'ID de session comme clé
	clientsMutex.Lock()
	clients[sessionID] = client
	clientsMutex.Unlock()

	log.Printf("Utilisateur connecté: Session=%s, UserID=%s", sessionID, userID)

	// Lancer les goroutines pour gérer la connexion
	go client.readPump()
	go client.writePump()
}

// GetUserIDFromSessionID récupère l'ID utilisateur à partir de l'ID de session
func GetUserIDFromSessionID(sessionID string) (string, error) {
	var userID string
	err := DB.QueryRow("SELECT user_id FROM sessions WHERE id = ?", sessionID).Scan(&userID)
	return userID, err
}

// GetSessionByUserID trouve la session active pour un utilisateur donné
func GetSessionByUserID(userID string) (string, bool) {
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	for sessionID, client := range clients {
		if client.UserID == userID {
			return sessionID, true
		}
	}
	return "", false
}

// SaveMessage enregistre un message dans la base de données
func SaveMessage(msg Message) (int, error) {
	// Utiliser la date actuelle si non fournie
	if msg.Date == "" {
		msg.Date = time.Now().Format("2006-01-02 15:04:05")
	}

	// Insérer le message dans la base de données en utilisant les user_id
	result, err := DB.Exec(
		"INSERT INTO private_msg (sender_id, receiver_id, content, date, read_status) VALUES (?, ?, ?, ?, ?)",
		msg.SenderID, msg.ReceiverID, msg.Content, msg.Date, 0)

	if err != nil {
		log.Println("Erreur d'enregistrement du message:", err)
		return 0, err
	}

	// Récupérer l'ID du message inséré
	id, err := result.LastInsertId()
	if err != nil {
		log.Println("Erreur de récupération de l'ID du message:", err)
		return 0, err
	}

	return int(id), nil
}

// UpdateCurrentChat met à jour l'ID de la conversation actuelle du client
func (c *Client) UpdateCurrentChat(receiverUserID string) {
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	c.CurrentChatID = receiverUserID
}

// GetUsernameByUserID récupère le nom d'utilisateur depuis la base de données
func GetUsernameByUserID(userID string) (string, error) {
	var username string
	err := DB.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&username)
	return username, err
}

// readPump lit les messages entrants et les transfère aux destinataires
func (c *Client) readPump() {
	defer func() {
		c.disconnect()
	}()

	c.Conn.SetReadLimit(4096)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second)) // Timeout de 60s
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second)) // Reset du timeout
		return nil
	})

	for {
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Println("Erreur de lecture:", err)
			}
			break
		}

		// Traitement des messages de type "changement de conversation"
		if msg.Content == "__CHAT_CHANGE__" {
			c.UpdateCurrentChat(msg.ReceiverID)

			// Marquer les messages comme lus
			_, err = DB.Exec("UPDATE private_msg SET read_status = 1 WHERE sender_id = ? AND receiver_id = ? AND read_status = 0",
				msg.ReceiverID, c.UserID)
			if err != nil {
				log.Println("Erreur lors du marquage des messages comme lus:", err)
			}

			continue
		}

		// Ne pas enregistrer les messages de type "__TYPING__" en DB
		if msg.Content == "__TYPING__" {
			// Envoyer le message au destinataire sans l'enregistrer
			sessionID, isOnline := GetSessionByUserID(msg.ReceiverID)
			if isOnline {
				clientsMutex.Lock()
				receiver, exists := clients[sessionID]
				clientsMutex.Unlock()

				if exists {
					receiver.Send <- msg
				}
			}
			continue
		}

		// Remplacer les ID de session par les ID utilisateur
		msg.SenderID = c.UserID

		// Récupérer le nom d'utilisateur de l'expéditeur
		username, err := GetUsernameByUserID(c.UserID)
		if err == nil {
			msg.Username = username
		}

		// Enregistrer le message dans la base de données
		msgID, err := SaveMessage(msg)
		if err == nil {
			msg.ID = msgID
			msg.Date = time.Now().Format("2006-01-02 15:04:05")
		}

		// Trouver la session active du destinataire
		sessionID, isOnline := GetSessionByUserID(msg.ReceiverID)

		if isOnline {
			// Récupérer le client du destinataire
			clientsMutex.Lock()
			receiver, exists := clients[sessionID]
			clientsMutex.Unlock()

			if exists {
				// Vérifier si le destinataire est actuellement dans la conversation avec l'expéditeur
				isInChat := receiver.CurrentChatID == c.UserID

				// Définir le statut de notification
				if !isInChat {
					msg.IsNew = true // Indicateur pour afficher une notification
				} else {
					// Marquer immédiatement comme lu si le destinataire est dans la conversation
					_, err = DB.Exec("UPDATE private_msg SET read_status = 1 WHERE id = ?", msgID)
					if err != nil {
						log.Println("Erreur lors du marquage du message comme lu:", err)
					}
				}

				receiver.Send <- msg
			}
		} else {
			log.Printf("Utilisateur %s non connecté: le message sera disponible à sa prochaine connexion", msg.ReceiverID)
		}

		// Renvoyer le message à l'expéditeur pour confirmation
		c.Send <- msg
	}
}

// writePump envoie les messages au client
func (c *Client) writePump() {
	ticker := time.NewTicker(10 * time.Second) // Envoie un ping toutes les 10s
	defer func() {
		ticker.Stop()
		c.disconnect()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{}) // Fermeture propre
				return
			}
			if err := c.Conn.WriteJSON(msg); err != nil {
				log.Println("Erreur d'écriture:", err)
				return
			}

		case <-ticker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Println("Erreur d'envoi du ping:", err)
				return
			}
		}
	}
}

// GetChatHistory récupère l'historique des messages entre deux utilisateurs
func GetChatHistory(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	senderSessionID := r.URL.Query().Get("session_id")
	receiverUserID := r.URL.Query().Get("receiver_id")
	offset := r.URL.Query().Get("offset")
	limit := r.URL.Query().Get("limit")

	if senderSessionID == "" || receiverUserID == "" {
		http.Error(w, "ID session et ID utilisateur destinataire requis", http.StatusBadRequest)
		return
	}

	if offset == "" {
		offset = "0"
	}

	if limit == "" {
		limit = "10"
	}

	// Récupérer l'ID utilisateur de l'expéditeur
	var senderUserID string
	err := db.QueryRow("SELECT user_id FROM sessions WHERE id = ?", senderSessionID).Scan(&senderUserID)
	if err != nil {
		http.Error(w, "Session invalide", http.StatusUnauthorized)
		log.Println("Erreur de récupération de l'ID utilisateur:", err)
		return
	}

	// Récupérer les messages entre les deux utilisateurs
	rows, err := db.Query(`
		SELECT id, sender_id, receiver_id, content, date 
		FROM private_msg 
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY date DESC
		LIMIT ? OFFSET ?
	`, senderUserID, receiverUserID, receiverUserID, senderUserID, limit, offset)

	if err != nil {
		http.Error(w, "Erreur de requête", http.StatusInternalServerError)
		log.Println("Erreur de requête:", err)
		return
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.Date); err != nil {
			log.Println("Erreur de scan:", err)
			continue
		}

		// Récupérer le nom d'utilisateur de l'expéditeur
		username, err := GetUsernameByUserID(msg.SenderID)
		if err == nil {
			msg.Username = username
		}

		messages = append(messages, msg)
	}

	// Marquer les messages du destinataire comme lus
	_, err = db.Exec("UPDATE private_msg SET read_status = 1 WHERE sender_id = ? AND receiver_id = ? AND read_status = 0",
		receiverUserID, senderUserID)
	if err != nil {
		log.Println("Erreur lors du marquage des messages comme lus:", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// GetUnreadMessageCount récupère le nombre de messages non lus par expéditeur
func GetUnreadMessageCount(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	sessionID := r.URL.Query().Get("session_id")

	if sessionID == "" {
		http.Error(w, "ID session requis", http.StatusBadRequest)
		return
	}

	// Récupérer l'ID utilisateur
	var userID string
	err := db.QueryRow("SELECT user_id FROM sessions WHERE id = ?", sessionID).Scan(&userID)
	if err != nil {
		http.Error(w, "Session invalide", http.StatusUnauthorized)
		log.Println("Erreur de récupération de l'ID utilisateur:", err)
		return
	}

	// Récupérer le nombre de messages non lus par expéditeur
	rows, err := db.Query(`
		SELECT sender_id, COUNT(*) as count 
		FROM private_msg 
		WHERE receiver_id = ? AND read_status = 0
		GROUP BY sender_id
	`, userID)

	if err != nil {
		http.Error(w, "Erreur de requête", http.StatusInternalServerError)
		log.Println("Erreur de requête:", err)
		return
	}
	defer rows.Close()

	type UnreadCount struct {
		SenderID string `json:"sender_id"`
		Count    int    `json:"count"`
	}

	unreadCounts := []UnreadCount{}
	for rows.Next() {
		var count UnreadCount
		if err := rows.Scan(&count.SenderID, &count.Count); err != nil {
			log.Println("Erreur de scan:", err)
			continue
		}
		unreadCounts = append(unreadCounts, count)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(unreadCounts)
}

// GetRecentMessages récupère les messages récents pour un utilisateur
func GetRecentMessages(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	sessionID := r.URL.Query().Get("session_id")

	if sessionID == "" {
		http.Error(w, "ID session requis", http.StatusBadRequest)
		return
	}

	// Récupérer l'ID utilisateur
	var userID string
	err := db.QueryRow("SELECT user_id FROM sessions WHERE id = ?", sessionID).Scan(&userID)
	if err != nil {
		http.Error(w, "Session invalide", http.StatusUnauthorized)
		log.Println("Erreur de récupération de l'ID utilisateur:", err)
		return
	}

	// Récupérer les messages récents envoyés par l'utilisateur
	rows, err := db.Query(`
		SELECT id, sender_id, receiver_id, content, date 
		FROM private_msg 
		WHERE sender_id = ? 
		ORDER BY date DESC
		LIMIT 10
	`, userID)

	if err != nil {
		http.Error(w, "Erreur de requête", http.StatusInternalServerError)
		log.Println("Erreur de requête:", err)
		return
	}
	defer rows.Close()

	messages := []Message{}
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.Date); err != nil {
			log.Println("Erreur de scan:", err)
			continue
		}
		messages = append(messages, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// disconnect supprime un client proprement
func (c *Client) disconnect() {
	c.once.Do(func() {
		clientsMutex.Lock()
		delete(clients, c.SessionID)
		clientsMutex.Unlock()

		close(c.Send)  // Ferme le canal d'envoi
		c.Conn.Close() // Ferme la connexion WebSocket

		log.Printf("Utilisateur déconnecté: Session=%s, UserID=%s", c.SessionID, c.UserID)
	})
}

// Get renvoie la liste des utilisateurs en ligne
func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	clientsMutex.Lock()
	defer clientsMutex.Unlock()

	type UserInfo struct {
		SessionID string `json:"session_id"`
		UserID    string `json:"user_id"`
		Username  string `json:"username"`
	}

	onlineUsers := []UserInfo{}

	for sessionID, client := range clients {
		var username string

		// Récupérer les informations de l'utilisateur depuis la table users
		err := db.QueryRow("SELECT username FROM users WHERE id = ?", client.UserID).Scan(&username)
		if err != nil {
			log.Println("Erreur lors de la récupération du nom d'utilisateur:", err)
			continue // Si l'utilisateur n'est pas trouvé, on ignore cet utilisateur
		}

		// Ajouter l'utilisateur en ligne à la liste
		onlineUsers = append(onlineUsers, UserInfo{
			SessionID: sessionID,
			UserID:    client.UserID,
			Username:  username,
		})
	}

	// Encoder la réponse en JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(onlineUsers)
}
