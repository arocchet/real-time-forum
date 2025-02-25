package post

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"main/server/api/categories"
	"net/http"
)

type Poste struct {
	ID           int    `json:"id"`
	Post_user_id int    `json:"post_user_id"`
	Post_user_name string `json:"post_user_name"`
	Category_name  string    `json:"category_name"`
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

	poste.Post_user_name = GetUsername(r,db)

	_, err = db.Exec("INSERT INTO posts (post_user_id, post_user_name, category_name,title,content) VALUES (?,?,?,?,?)", poste.Post_user_id, poste.Post_user_name , poste.Category_name, poste.Title, poste.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = categories.NewCategory(poste.Category_name, db)
	if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
		return
  }

	fmt.Println("Post added successfuly !")
}

func Get(w http.ResponseWriter, r *http.Request, db *sql.DB) {
	rows, err := db.Query("SELECT id, post_user_id, post_user_name, category_name, title, content, date FROM posts")
	if err != nil {
		log.Println(err)
		return
	}
	defer rows.Close()

	var posts []Poste
	for rows.Next() {
		var post Poste
		err = rows.Scan(&post.ID, &post.Post_user_id, &post.Post_user_name, &post.Category_name, &post.Title, &post.Content, &post.Date)
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


func GetUsername(r *http.Request, db *sql.DB) string {
	cookie, err := r.Cookie("session")
	if err != nil {
		fmt.Println("No cookie")
		return ""
	}
	sessionID := cookie.Value

	user_id, err := db.Query("SELECT user_id FROM sessions WHERE id =?", sessionID)
	if err != nil {
		fmt.Println("No usr id")
    return ""
  }
	defer user_id.Close()

	var UserID string
	for user_id.Next() {
		var userID string
    err = user_id.Scan(&userID)
    if err != nil {
      return ""
    }
    UserID = userID
		break
	}


	
	user_name, err := db.Query("SELECT username FROM users WHERE id =?", UserID)
	if err != nil {
		fmt.Println("No usr name", user_id)
    return ""
  }
	defer user_name.Close()

	
	for user_name.Next() {
		var userName string
    err = user_name.Scan(&userName)
    if err != nil {
      return ""
    }
    return userName
	}

	return ""
}