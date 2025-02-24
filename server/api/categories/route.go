package categories

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var cat Category

	err := json.NewDecoder(r.Body).Decode(&cat)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if cat.Name == "" {
		http.Error(w, "Missing fields in request", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("INSERT INTO categories (name) VALUES (?)", cat.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Println("Category added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, name FROM categories")
	if err != nil {
		log.Println(err)
		return
	}
	defer rows.Close()

	var categories []Category
	for rows.Next() {
		var cat Category
		err = rows.Scan(&cat.ID, &cat.Name)
		if err != nil {
			log.Println(err)
			return
		}
		categories = append(categories, cat)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}
