package comment

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Comment struct {
	ID int `json:"id"`
	Parent_post int `json:"parent_post"`
	Sender_id int `json:"sender_id"`
	Content string `json:"content"`
	Date string `json:"date"`
}

func Post(w http.ResponseWriter, r *http.Request, db *sql.DB){
	var comment Comment	

	err := json.NewDecoder(r.Body).Decode(&comment)
	if err != nil {
    http.Error(w, err.Error(), http.StatusBadRequest)
    return
  }

	if comment.Content == "" {
        http.Error(w, "Missing fields in request", http.StatusBadRequest)
        return
  }
	
	_, err = db.Exec("INSERT INTO comments (parent_post,sender_id,content) VALUES (?,?,?)", comment.Parent_post, comment.Sender_id, comment.Content)
	if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }

	fmt.Println("Comment added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, parent_post, sender_id, date, content FROM comments")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var com Comment
		err = rows.Scan(&com.ID, &com.Parent_post, &com.Sender_id, &com.Date, &com.Content)
		if err != nil {
			log.Fatal(err)
		}
		comments = append(comments, com)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

func Put(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}

func Delete(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "Not Implemented", 501)
}
