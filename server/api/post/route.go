package post

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Poste struct {
	ID           int    `json:"id"`
	Post_user_id int    `json:"post_user_id"`
	Category_id  int    `json:"category_id"`
	Date         string `json:"date"`
	Title        string `json:"title"`
	Content      string `json:"content"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	var poste Poste

	err := json.NewDecoder(r.Body).Decode(&poste)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if poste.Content == "" {
		http.Error(w, "Missing fields in request", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("INSERT INTO posts (post_user_id,category_id,title,content) VALUES (?,?,?,?)", poste.Post_user_id, poste.Category_id, poste.Title, poste.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Println("Post added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, post_user_id, category_id, title, content, date FROM posts")
	if err != nil {
		log.Println(err)
		return
	}
	defer rows.Close()

	var posts []Poste
	for rows.Next() {
		var post Poste
		err = rows.Scan(&post.ID, &post.Post_user_id, &post.Category_id, &post.Title, &post.Content, &post.Date)
		if err != nil {
			log.Println(err)
			return
		}
		posts = append(posts, post)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}
