package sessions

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gofrs/uuid/v5"
)

type Session struct {
	ID string `json:"id"`
	UserID string    `json:"user_id"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB){
	var session Session	

	err := json.NewDecoder(r.Body).Decode(&session)
	if err != nil {
    http.Error(w, err.Error(), http.StatusBadRequest)
    return
  }

	if session.UserID == "" {
        http.Error(w, "Missing fields in request", http.StatusBadRequest)
        return
  }

	var u1 = uuid.Must(uuid.NewV4())
	
	_, err = db.Exec("INSERT INTO sessions (id,user_id) VALUES (?,?)", u1,session.UserID)
	if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }

	fmt.Println("Session added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, user_id FROM sessions")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var session Session
		err = rows.Scan(&session.ID, &session.UserID)
		if err != nil {
			log.Fatal(err)
		}
		sessions = append(sessions, session)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}
