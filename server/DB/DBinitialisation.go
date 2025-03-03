package db

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func Init() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", "./database.db")
	if err != nil {
		log.Fatal(err)
		return nil, err
	}

	// Configurer le pool de connexions
	db.SetMaxOpenConns(10)           // Maximum de connexions ouvertes simultanément
	db.SetMaxIdleConns(5)            // Maximum de connexions inactives conservées
	db.SetConnMaxLifetime(time.Hour) // Durée de vie maximale d'une connexion

	// Créer les tables si elles n'existent pas
	CreateUser(db)
	CreateCategories(db)
	CreatePrivateMsg(db)
	CreateComments(db)
	CreatePosts(db)
	CreateSessions(db)

	// Activer le mode WAL pour permettre plus de concurrence
	_, err = db.Exec("PRAGMA journal_mode=WAL;")
	if err != nil {
		log.Println("Erreur en configurant WAL mode:", err)
	}

	// Définir un timeout pour les transactions bloquées
	_, err = db.Exec("PRAGMA busy_timeout = 5000;") // 5 secondes
	if err != nil {
		log.Println("Erreur en configurant busy_timeout:", err)
	}

	return db, nil
}
func CreateUser(db *sql.DB) {
	query := `
	CREATE TABLE IF NOT EXISTS users(
		id VARCHAR(55) PRIMARY KEY NOT NULL UNIQUE,
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
		read_status INTEGER,
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
		post_user_name TEXT NOT NULL,
		category_name TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
		title TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY(post_user_id) REFERENCES users(id),
    FOREIGN KEY(category_name) REFERENCES categories(name)	
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
		name TEXT PRIMARY KEY NOT NULL UNIQUE,
		id INTEGER UNIQUE
	);`

	_, err := db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Table 'categories' created successfully")
}

func CreateSessions(db *sql.DB) {
	query := `
    CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(55) PRIMARY KEY NOT NULL UNIQUE,
				user_id VARCHAR(55) NOT NULL UNIQUE
    );`

	_, err := db.Exec(query)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Table 'sessions' created successfully")
}
