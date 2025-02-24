package register

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/gofrs/uuid/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserInfo struct {
	Username  string `json:"username"`
	FirstName string `json:"firstname"`
	LastName  string `json:"lastname"`
	Gender    string `json:"gender"`
	Age       int    `json:"age"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB, port string) {
	var userInfo UserInfo

	err := json.NewDecoder(r.Body).Decode(&userInfo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if userInfo.Email == "" {
		http.Error(w, "Missing email in request", http.StatusBadRequest)
		return
	}

	var existingEmail string
	err = db.QueryRow("SELECT email FROM users WHERE email = ?", userInfo.Email).Scan(&existingEmail)
	if err == nil {
		http.Error(w, "Email already in use", http.StatusConflict)
		return
	} else if err != sql.ErrNoRows {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var u1 = uuid.Must(uuid.NewV4())
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(userInfo.Password), bcrypt.DefaultCost)

	if err != nil {
		http.Error(w, "Hashing error", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec("INSERT INTO users (id, username, first_name, last_name, gender, age, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", u1, userInfo.Username, userInfo.FirstName, userInfo.LastName, userInfo.Gender, userInfo.Age, userInfo.Email, string(hashedPassword))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var sessionID = uuid.Must(uuid.NewV4())
	postData := map[string]string{
		"user_id": u1.String(),
		"id":      sessionID.String(),
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
	CreateCookie(w, sessionID.String())

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Register successful"))
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
