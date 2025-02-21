package main

import (
	"log"
	"main/server/handlers"
	"net/http"
	"os"
	"time"
)


func main() {

	port := "8080"

	if len(os.Args ) > 1 {
		port = os.Args[1]
	}

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	server := http.Server{
		Addr:              ":"+ port,
		Handler:           mux,
		MaxHeaderBytes:    1 << 26,
		ReadTimeout:       30 * time.Second,
		ReadHeaderTimeout: 30 * time.Second,
		WriteTimeout:      45 * time.Second,
		IdleTimeout:       3 * time.Minute,
	}

	mux.HandleFunc("/", handlers.HomeHandler)

	log.Println("Server started on http://localhost:"+port)

	err := server.ListenAndServe()
	if err != nil {
		log.Fatalf("failed to start server: %s", err)
	}

}
