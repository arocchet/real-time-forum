package sessions

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type Session struct {
	ID     string `json:"id,omitempty"`
	UserID string `json:"user_id"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var session Session

	err := json.NewDecoder(r.Body).Decode(&session)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	if session.UserID == "" {
		http.Error(w, "Missing user_id in request", http.StatusBadRequest)
		return
	}

	// Vérifier si l'user_id a déjà une session active
	var existingSessionID string
	err = db.QueryRow("SELECT id FROM sessions WHERE user_id = ?", session.UserID).Scan(&existingSessionID)
	if err == nil {
		// Supprimer l'ancienne session
		_, err = db.Exec("DELETE FROM sessions WHERE id = ?", existingSessionID)
		if err != nil {
			http.Error(w, "Failed to replace session", http.StatusInternalServerError)
			return
		}
	} else if err != sql.ErrNoRows {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("INSERT INTO sessions (id, user_id) VALUES (?, ?)", session.ID, session.UserID)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Session successfully created"))
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "No session cookie found", http.StatusUnauthorized)
		return
	}

	var session Session
	err = db.QueryRow("SELECT id, user_id FROM sessions WHERE id = ?", cookie.Value).Scan(&session.ID, &session.UserID)
	if err == sql.ErrNoRows {
		cookie.MaxAge = -1
		http.SetCookie(w, cookie)
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Invalid session"))
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Valid session"))
}
func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "No session cookie found", http.StatusUnauthorized)
		return
	}

	_, err = db.Exec("DELETE FROM sessions WHERE id = ?", cookie.Value)
	if err != nil {
		http.Error(w, "Failed to replace session", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("session deleted"))

}
