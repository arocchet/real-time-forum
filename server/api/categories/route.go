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

	// Retrieve the highest id from the categories table
	var maxID int
	err = db.QueryRow("SELECT COALESCE(MAX(id), 0) FROM categories").Scan(&maxID)
	if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
	};

	// Calculate the new id
	newID := maxID + 1

	_, err = db.Exec("INSERT INTO categories (name,id) VALUES (?,?)", cat.Name, newID)
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

func NewCategory(name string, db *sql.DB) error{
	var maxID int
	err := db.QueryRow("SELECT COALESCE(MAX(id), 0) FROM categories").Scan(&maxID)
	if err != nil {
			fmt.Println( err.Error())
			return err
	};

	// Calculate the new id
	newID := maxID + 1

	_, err = db.Exec("INSERT OR IGNORE INTO categories (name,id) VALUES (?,?)", name, newID)
	if err != nil {
		fmt.Println(err.Error())
		return nil
	}

	fmt.Println("Category added successfuly !")
	return nil
}
