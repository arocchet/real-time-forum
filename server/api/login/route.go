package login

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gofrs/uuid/v5"
	"golang.org/x/crypto/bcrypt"
)

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB, port string) {
	var loginData struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	if loginData.Email == "" || loginData.Password == "" {
		http.Error(w, "Missing email or password", http.StatusBadRequest)
		return
	}

	// Récupérer l'ID et le mot de passe hashé depuis la base de données
	var userID string
	var hashedPassword string
	err = db.QueryRow("SELECT id, password FROM users WHERE email = ?", loginData.Email).Scan(&userID, &hashedPassword)
	if err == sql.ErrNoRows {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Comparer les mots de passe
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(loginData.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Construire les données pour la requête HTTP
	var u1 = uuid.Must(uuid.NewV4())
	postData := map[string]string{
		"user_id": userID,
		"id":      u1.String(),
	}
	jsonData, _ := json.Marshal(postData)

	// Effectuer une requête HTTP POST vers l'API
	apiURL := "http://localhost:" + port + "/api/sessions"
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		http.Error(w, `Failed to communicate with API`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Lire la réponse de l'API
	if resp.StatusCode == http.StatusConflict {
		http.Error(w, "User already online", http.StatusConflict)
		return
	} else if resp.StatusCode == http.StatusInternalServerError {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	// Répondre au client
	CreateCookie(w, u1.String())
	w.WriteHeader(http.StatusOK)
}

func CreateCookie(w http.ResponseWriter, sessionID string) {
	cookie := &http.Cookie{
		Name:   "session",
		Value:  sessionID,
		Path:   "/",
		MaxAge: 1800,
	}
	http.SetCookie(w, cookie)
}
