import { loginForm } from "./main.js";

let ws;
let userId;

export async function connect() {
  const sessionCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("session="));

  if (!sessionCookie || !sessionCookie.split("=")[1]) {
    clearSession();
    return;
  }

  const response = await fetch("/api/sessions", {
    method: "GET",
    credentials: "include",
  });

  if (response.status !== 200) {
    clearSession();
    loginForm();
    return;
  }

  let sessionID = sessionCookie.split("=")[1];

  ws = new WebSocket(`ws://localhost:8080/ws?uuid=${sessionID}`);

  ws.onopen = () => {
    console.log("Connecté au serveur websocket: ", sessionID);
  };

  ws.onmessage = (event) => {};

  ws.onerror = (error) => console.log("Erreur WebSocket:", error);

  ws.onclose = () => console.log("Déconnecté");
}

// Fonction pour fermer le WebSocket proprement
export function disconnect() {
  if (ws) {
    ws.close();
    console.log("WebSocket fermé");
  }
}

// Fonction pour supprimer le cookie "session"
function clearSession() {
  document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
