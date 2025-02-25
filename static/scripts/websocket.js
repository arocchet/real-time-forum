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

  ws.onmessage = (event) => {
    try {
      let msg = JSON.parse(event.data);

      if (!msg.sender_id || !msg.content) {
        console.log("Message mal formaté :", msg);
        return;
      }

     // Afficher le message dans le bon chat pour L'AUTRE
    } catch (error) {
      console.error("Erreur de parsing JSON:", error);
    }
  };

  ws.onerror = (error) => console.log("Erreur WebSocket:", error);

  ws.onclose = () => console.log("Déconnecté");
}

export function sendMessage() {
  let receiverId = document.getElementById("receiverId").value; // A changer par l'ID du destinataire quand on appuie sur la personne en ligne
  let message = document.getElementById("message").value; // Sera la valeur de l'input du tchat

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("Vous n'êtes pas connecté !");
    return;
  }

  if (!receiverId || !message) {
    alert("Veuillez entrer un destinataire et un message !");
    return;
  }

  let msg = {
    sender_id: userId,
    receiver_id: receiverId,
    content: message,
  };

  ws.send(JSON.stringify(msg));

  // Afficher le message dans le bon chat pour MOI
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
