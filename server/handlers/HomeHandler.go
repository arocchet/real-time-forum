package handlers

import "net/http"

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./static/pages/index.html")
}
