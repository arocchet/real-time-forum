package privatemsg

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Message struct {
	ID          int    `json:"id"`
	Sender_id   int    `json:"sender_id"`
	Receiver_id int    `json:"receiver_id"`
	Content     string `json:"content"`
	Date        string `json:"date"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var msg Message

	err := json.NewDecoder(r.Body).Decode(&msg)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if msg.Content == "" {
		http.Error(w, "Missing fields in request", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("INSERT INTO private_msg (sender_id,receiver_id,content) VALUES (?,?,?)", msg.Sender_id, msg.Receiver_id, msg.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Println("Message added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, sender_id, receiver_id, content, date FROM private_msg")
	if err != nil {
		log.Println(err)
		return
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		err = rows.Scan(&msg.ID, &msg.Sender_id, &msg.Receiver_id, &msg.Content, &msg.Date)
		if err != nil {
			log.Println(err)
			return
		}
		messages = append(messages, msg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}
