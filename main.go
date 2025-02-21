package main

import (
	"log"
	"net/http"
	"time"
)

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./static/pages/index.html")
}

func main() {

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	server := http.Server{
		Addr:              ":8080",
		Handler:           mux,
		MaxHeaderBytes:    1 << 26,
		ReadTimeout:       30 * time.Second,
		ReadHeaderTimeout: 30 * time.Second,
		WriteTimeout:      45 * time.Second,
		IdleTimeout:       3 * time.Minute,
	}

	mux.HandleFunc("/", HomeHandler)

	log.Println("Server started on http://localhost:8080")

	err := server.ListenAndServe()
	if err != nil {
		log.Fatalf("failed to start server: %s", err)
	}

}
