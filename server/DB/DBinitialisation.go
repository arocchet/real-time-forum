package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func Init() (*sql.DB,error) {

	db, err := sql.Open("sqlite3","./database.db")
	if err != nil {
    log.Fatal(err)
		return nil,err
  }

	CreateUser(db)
	CreateCategories(db)
	CreatePrivateMsg(db)
	CreateComments(db)
	CreatePosts(db)

	return db,nil
}

func CreateUser(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS users(
		id VARCHAR(55) PRIMARY KEY,
		username TEXT NOT NULL UNIQUE,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
		email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL	
	);`

	_, err := db.Exec(query)
	if err != nil {
    log.Fatal(err)
  }
	log.Println("Table 'users' created successfully")
}

func CreatePrivateMsg(db *sql.DB) {
	query := `
    CREATE TABLE IF NOT EXISTS private_msg (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
    );`

	_, err := db.Exec(query)
	if err != nil {
    log.Fatal(err)
  }
	log.Println("Table 'private_msg' created successfully")
}

func CreateComments(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS comments(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		parent_post INTEGER NOT NULL,
		sender_id INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    FOREIGN KEY(parent_post) REFERENCES posts(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)	
	);`

	_, err := db.Exec(query)
	if err != nil {
    log.Fatal(err)
  }
	log.Println("Table 'comments' created successfully")
}

func CreatePosts(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS posts(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_user_id INTEGER NOT NULL,
		category_id INTEGER NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
		title TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY(post_user_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)	
	);`

	_, err := db.Exec(query)
	if err != nil {
    log.Fatal(err)
  }
	log.Println("Table 'posts' created successfully")
}

func CreateCategories(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS categories(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE
	);`

	_, err := db.Exec(query)
	if err != nil {
    log.Fatal(err)
  }
	log.Println("Table 'categories' created successfully")
}