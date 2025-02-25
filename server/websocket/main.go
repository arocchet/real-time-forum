package websocket

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Structure pour stocker les connexions des utilisateurs
type Client struct {
	ID   string
	Conn *websocket.Conn
	Send chan Message
}

// Gestion des connexions WebSocket
var clients = make(map[string]*Client)
var clientsMutex = sync.Mutex{}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Structure du message
type Message struct {
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`
	Content    string `json:"content"`
}

// HandleConnections gère une nouvelle connexion WebSocket
func HandleConnections(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("uuid")
	if id == "" {
		http.Error(w, "UUID requis", http.StatusBadRequest)
		return
	}

	// Upgrade de la connexion HTTP en WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Erreur WebSocket:", err)
		return
	}

	client := &Client{
		ID:   id,
		Conn: conn,
		Send: make(chan Message),
	}

	// Ajouter le client à la liste
	clientsMutex.Lock()
	clients[id] = client
	clientsMutex.Unlock()

	log.Println("Utilisateur connecté:", id)

	// Lancer les goroutines pour gérer la connexion
	// go client.readPump()
	// go client.writePump()
}

// readPump lit les messages entrants et les transfère aux destinataires
// func (c *Client) readPump() {
// 	defer func() {
// 		c.disconnect()
// 	}()

// 	c.Conn.SetReadLimit(1024)
// 	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second)) // Timeout de 60s
// 	c.Conn.SetPongHandler(func(string) error {
// 		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second)) // Reset du timeout
// 		return nil
// 	})

// 	for {
// 		var msg Message
// 		err := c.Conn.ReadJSON(&msg)
// 		if err != nil {
// 			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
// 				log.Println("Erreur de lecture:", err)
// 			}
// 			break
// 		}

// 		// Envoyer au bon destinataire
// 		clientsMutex.Lock()
// 		receiver, exists := clients[msg.ReceiverID]
// 		clientsMutex.Unlock()

// 		if exists {
// 			receiver.Send <- msg
// 		} else {
// 			log.Println("Utilisateur non trouvé:", msg.ReceiverID)
// 		}
// 	}
// }

// // writePump envoie les messages au client
// func (c *Client) writePump() {
// 	ticker := time.NewTicker(10 * time.Second) // Envoie un ping toutes les 30s
// 	defer func() {
// 		ticker.Stop()
// 		c.disconnect()
// 	}()

// 	for {
// 		select {
// 		case msg, ok := <-c.Send:
// 			if !ok {
// 				c.Conn.WriteMessage(websocket.CloseMessage, []byte{}) // Fermeture propre
// 				return
// 			}
// 			if err := c.Conn.WriteJSON(msg); err != nil {
// 				log.Println("Erreur d'écriture:", err)
// 				return
// 			}

// 		case <-ticker.C:
// 			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
// 				log.Println("Erreur d'envoi du ping:", err)
// 				return
// 			}
// 		}
// 	}
// }

// // disconnect supprime un client proprement
// func (c *Client) disconnect() {
// 	clientsMutex.Lock()
// 	delete(clients, c.ID)
// 	clientsMutex.Unlock()

// 	close(c.Send)
// 	c.Conn.Close()

// 	log.Println("Utilisateur déconnecté:", c.ID)
// }
