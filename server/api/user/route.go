package user

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gofrs/uuid/v5"
)

type User struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	First_name string `json:"first_name"`
	Last_name  string `json:"last_name"`
	Gender     string `json:"gender"`
	Age        int    `json:"age"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var usr User

	err := json.NewDecoder(r.Body).Decode(&usr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if usr.Password == "" {
		http.Error(w, "Missing fields in request", http.StatusBadRequest)
		return
	}

	var u1 = uuid.Must(uuid.NewV4())

	_, err = db.Exec("INSERT INTO users (id,username,first_name,last_name,gender,age,email,password) VALUES (?,?,?,?,?,?,?,?)", u1, usr.Username, usr.First_name, usr.Last_name, usr.Gender, usr.Age, usr.Email, usr.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Println("User added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, username,first_name,last_name,gender,age,email,password FROM users")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var usr User
		err = rows.Scan(&usr.ID, &usr.Username, &usr.First_name, &usr.Last_name, &usr.Gender, &usr.Age, &usr.Email, &usr.Password)
		if err != nil {
			log.Fatal(err)
		}
		users = append(users, usr)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}
