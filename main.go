package main

import (
	"log"
	db "main/server/DB"
	"main/server/api/categories"
	comment "main/server/api/comment"
	post "main/server/api/post"
	privatemsg "main/server/api/private_msg"
	user "main/server/api/user"
	"main/server/handlers"
	"net/http"
	"os"
	"time"
)

func main() {
	db,err := db.Init()
	if err != nil {
    log.Fatal(err)
  }
	defer db.Close()

	port := "8088" // port par défaut

	// Si un port est passé en argument, on l'utilise
	if len(os.Args) > 1 {
		port = os.Args[1]
	}

	// Mux (Serveur de gestion des routes)
	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	// Routes avec gestion des méthodes HTTP
	mux.HandleFunc("/", handlers.HomeHandler)

	// API routes
	mux.HandleFunc("/api/user", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			user.Get(w, r)
		case "POST":
			user.Post(w, r)
		case "PUT":
			user.Put(w, r)
		case "DELETE":
			user.Delete(w, r)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/private_msg", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			privatemsg.Get(w, r,db)
		case "POST":
			privatemsg.Post(w, r,db)
		case "PUT":
			privatemsg.Put(w, r)
		case "DELETE":
			privatemsg.Delete(w, r)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/categories", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			categories.Get(w, r, db)
		case "POST":
			categories.Post(w, r, db)
		case "PUT":
			categories.Put(w, r)
		case "DELETE":
			categories.Delete(w, r)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/post", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			post.Get(w, r, db)
		case "POST":
			post.Post(w, r, db)
		case "PUT":
			post.Put(w, r)
		case "DELETE":
			post.Delete(w, r)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/comment", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			comment.Get(w, r, db)
		case "POST":
			comment.Post(w, r, db)
		case "PUT":
			comment.Put(w, r)
		case "DELETE":
			comment.Delete(w, r)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
	})

	// Démarrage du serveur HTTP
	server := http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		MaxHeaderBytes:    1 << 26,
		ReadTimeout:       30 * time.Second,
		ReadHeaderTimeout: 30 * time.Second,
		WriteTimeout:      45 * time.Second,
		IdleTimeout:       3 * time.Minute,
	}

	// Lancer le serveur
	log.Println("Server started on http://localhost:" + port)
	err = server.ListenAndServe()
	if err != nil {
		log.Fatalf("failed to start server: %s", err)
	}
}
