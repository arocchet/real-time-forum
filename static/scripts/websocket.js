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

export async function getOnlineUsers() {
  const sessionCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("session="));
  let sessionCookieID = null;

  if (!sessionCookie || !sessionCookie.split("=")[1]) {
    clearSession();
  } else {
    sessionCookieID = sessionCookie.split("=")[1];
  }

  const response = await fetch("/api/online-users", {
    method: "GET",
  });

  let datas = await response.json();

  // Sélection de la div contenant les utilisateurs en ligne
  const onlineMenu = document.getElementById("sub-online-menu");

  // Récupérer tous les éléments <li> existants
  const existingUsers = new Set(
    Array.from(onlineMenu.children).map((li) => li.id)
  );

  // Créer un set des utilisateurs actuellement en ligne
  const onlineUsersSet = new Set(datas.map((data) => data.session_id));

  // Supprimer les utilisateurs qui ne sont plus en ligne
  existingUsers.forEach((sessionId) => {
    if (!onlineUsersSet.has(sessionId)) {
      document.getElementById(sessionId)?.remove();
    }
  });

  // Ajouter les nouveaux utilisateurs
  datas.forEach((data) => {
    if (!existingUsers.has(data.session_id)) {
      // Création du nouvel élément <li>
      const listItem = document.createElement("li");
      listItem.id = data.session_id;

      // Création de la div contenant le SVG + Nom de l'utilisateur
      listItem.innerHTML = `
        <div class="a connected-user">
          <svg role="img" width="24px" viewBox="0 0 24 24" aria-label="icon">
            <g fill="var(--greenFill)">
              <path d="M18.9773 8.99844L10.7749 17.4458L5.22394 12.2751L5.85311 11.5997L10.7425 16.1542L18.3151 8.3554L18.9773 8.99844Z"></path>
              <path d="M12.0001 2.67692C6.85107 2.67692 2.67698 6.85101 2.67698 12C2.67698 17.149 6.85107 21.3231 12.0001 21.3231C17.1491 21.3231 21.3231 17.149 21.3231 12C21.3231 6.85101 17.1491 2.67692 12.0001 2.67692ZM1.75391 12C1.75391 6.3412 6.34127 1.75385 12.0001 1.75385C17.6589 1.75385 22.2462 6.3412 22.2462 12C22.2462 17.6588 17.6589 22.2462 12.0001 22.2462C6.34127 22.2462 1.75391 17.6588 1.75391 12Z"></path>
            </g>
          </svg>
          ${sessionCookieID == data.session_id ? "Vous" : data.username}
        </div>
      `;

      listItem.addEventListener("click", () => {
        const main = document.querySelector("main");
        main.innerHTML = `
        <div id="new-post" class="new-post" style="display:none">+</div>
        <button id="logout-btn" class="logout-btn">
          <svg role="img" width="40px" viewBox="0 0 130 130" aria-label="icon">
            <path
              fill="none"
              stroke="var(--neutral)"
              stroke-width="3px"
              d="M85 21.81a51.5 51.5 0 1 1-39.4-.34M64.5 10v51.66"
              style="transition: stroke 0.2s ease-out, opacity 0.2s ease-out"
            ></path>
          </svg>
        </button>
        <div class="new-msg">MESSAGE</div>
        <div id="new-msg-container">
          <input type="text" placeholder="Message ..."></input>
          <button id="send-msg">Send</button> 
        </div>`;
      });

      // Ajoute l'élément à la liste
      onlineMenu.appendChild(listItem);
    }
  });
}
