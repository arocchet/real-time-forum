import { loginForm } from "./main.js";

let ws;
let sessionId;
let userId;
let notifications = new Map(); // Pour stocker les notifications par utilisateur

export async function connect() {
  const sessionCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("session="));

  if (!sessionCookie || !sessionCookie.split("=")[1]) {
    clearSession();
    return;
  }

  sessionId = sessionCookie.split("=")[1];

  const response = await fetch("/api/sessions", {
    method: "GET",
    credentials: "include",
  });

  if (response.status !== 200) {
    clearSession();
    loginForm();
    return;
  }

  try {
    // Récupérer l'ID utilisateur associé à cette session
    const userData = await response.json();
    userId = userData.user_id; // Supposons que l'API renvoie un objet avec user_id
  } catch (error) {
    console.error("Erreur lors de la récupération des informations utilisateur:", error);
    clearSession();
    loginForm();
    return;
  }

  ws = new WebSocket(`ws://localhost:8080/ws?uuid=${sessionId}`);

  ws.onopen = () => {
    console.log("Connecté au serveur websocket avec session ID:", sessionId);
    console.log("ID utilisateur associé:", userId);
    
    // Charger les compteurs de messages non lus dès la connexion
    loadUnreadCounts();
  };

  ws.onmessage = (event) => {
    try {
      let msg = JSON.parse(event.data);

      if (!msg.sender_id || !msg.content) {
        console.log("Message mal formaté :", msg);
        return;
      }
      
      const main = document.querySelector("main");
      const currentChatId = main.dataset.userId; // On stocke maintenant l'user_id et non la session_id
      
      // Si le message vient de nous (confirmation d'envoi)
      if (msg.sender_id === userId) {
        displayMessage(msg, true);
        return;
      }
      
      // Si le message est pour la conversation actuellement ouverte
      if (currentChatId === msg.sender_id) {
        displayMessage(msg, false);
      } else {
        // Si le message est pour une autre conversation, afficher une notification
        showNotification(msg);
      }
    } catch (error) {
      console.error("Erreur de parsing JSON:", error);
    }
  };

  ws.onerror = (error) => console.log("Erreur WebSocket:", error);

  ws.onclose = () => console.log("Déconnecté");
}

// Charge les compteurs de messages non lus
async function loadUnreadCounts() {
  try {
    const response = await fetch(`/api/unread-counts?session_id=${sessionId}`);
    if (response.status === 200) {
      const unreadCounts = await response.json();
      
      // Mettre à jour les notifications pour chaque expéditeur
      unreadCounts.forEach(count => {
        notifications.set(count.sender_id, count.count);
        updateNotificationBadge(count.sender_id);
      });
    }
  } catch (error) {
    console.error("Erreur lors du chargement des messages non lus:", error);
  }
}

// Affiche un message dans la conversation
function displayMessage(msg, isSelf) {
  const main = document.querySelector("main");
  const chatMessages = main.querySelector(".chat-messages") || main;
  
  // Créer l'élément de message avec une classe différente selon l'expéditeur
  let messageElement = document.createElement("div");
  messageElement.className = isSelf ? "message-sent" : "message-received";
  
  // Ajouter le contenu du message
  messageElement.innerHTML = `
    <div class="message-content">${msg.content}</div>
    <div class="message-time">${formatDate(msg.date)}</div>
  ;`
  
  chatMessages.appendChild(messageElement);
  
  // Faire défiler vers le bas pour voir le nouveau message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Formate la date pour l'affichage
function formatDate(dateString) {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Affiche une notification pour un nouveau message
function showNotification(msg) {
  // Incrémenter le compteur de notifications pour cet expéditeur
  if (!notifications.has(msg.sender_id)) {
    notifications.set(msg.sender_id, 0);
  }
  notifications.set(msg.sender_id, notifications.get(msg.sender_id) + 1);
  
  // Mettre à jour le badge de notification sur l'utilisateur correspondant
  updateNotificationBadge(msg.sender_id);
  
  // Jouer un son de notification (optionnel)
  playNotificationSound();
}

// Met à jour le badge de notification sur l'utilisateur correspondant
function updateNotificationBadge(senderUserId) {
  // Trouver l'élément utilisateur par son attribut data-user-id
  const userItems = document.querySelectorAll('li[data-user-id]');
  let userItem = null;
  
  for (const item of userItems) {
    if (item.dataset.userId === senderUserId) {
      userItem = item;
      break;
    }
  }
  
  if (!userItem) return;
  
  // Rechercher un badge existant ou en créer un nouveau
  let badge = userItem.querySelector(".notification-badge");
  const count = notifications.get(senderUserId);
  
  if (!badge && count > 0) {
    badge = document.createElement("span");
    badge.className = "notification-badge";
    userItem.querySelector(".a").appendChild(badge);
  }
  
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? "block" : "none";
  }
}

// Efface les notifications pour un utilisateur spécifique
function clearNotifications(userId) {
  notifications.set(userId, 0);
  updateNotificationBadge(userId);
}

// Joue un son de notification
function playNotificationSound() {
  const audio = new Audio('/notification.mp3'); // Assurez-vous d'avoir ce fichier
  audio.play().catch(e => console.log("Erreur de lecture audio:", e));
}

export function sendMessage() {
  const main = document.querySelector("main");
  let receiverUserId = main.dataset.userId;
  let messageInput = document.getElementById("message");
  let message = messageInput.value;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("Vous n'êtes pas connecté !");
    return;
  }

  if (!message) {
    return; // Ne pas envoyer de message vide
  }

  let msg = {
    sender_id: userId, // On utilise maintenant l'ID utilisateur et non l'ID session
    receiver_id: receiverUserId,
    content: message,
  };

  ws.send(JSON.stringify(msg));
  
  // Vider l'input
  messageInput.value = "";
  messageInput.focus();
  
  // Note: Le message sera affiché quand il reviendra avec l'ID et la date
}

// Informe le serveur du changement de conversation active
export function switchChat(receiverUserId) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  // Envoyer un message spécial pour indiquer le changement de conversation
  let msg = {
    sender_id: userId,
    receiver_id: receiverUserId,
    content: "__CHAT_CHANGE__"
  };
  
  ws.send(JSON.stringify(msg));
  
  // Effacer les notifications pour cette conversation
  clearNotifications(receiverUserId);
}

// Charge l'historique des messages pour une conversation
export async function loadChatHistory(receiverUserId) {
  try {
    const response = await fetch(`/api/chat-history?session_id=${sessionId}&receiver_id=${receiverUserId}`);
    if (response.status === 200) {
      const messages = await response.json();
      
      // Effacer la conversation actuelle
      const main = document.querySelector("main");
      const chatMessages = main.querySelector(".chat-messages");
      
      if (chatMessages) {
        chatMessages.innerHTML = '';
      }
      
      // Afficher tous les messages
      messages.forEach(msg => {
        displayMessage(msg, msg.sender_id === userId);
      });
      
      // Faire défiler vers le bas
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  } catch (error) {
    console.error("Erreur de chargement de l'historique:", error);
  }
}

export function disconnect() {
  if (ws) {
    ws.close();
    console.log("WebSocket fermé");
  }
}

function clearSession() {
  document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

export async function getOnlineUsers() {
  const sessionCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("session="));
  
  if (!sessionCookie || !sessionCookie.split("=")[1]) {
    clearSession();
    return;
  }

  const response = await fetch("/api/online-users", {
    method: "GET",
  });

  let datas = await response.json();

  // Sélection de la div contenant les utilisateurs en ligne
  const onlineMenu = document.getElementById("sub-online-menu");

  // Nettoyer le menu actuel pour une reconstruction complète
  // (cela évite les problèmes avec les attributs data-user-id)
  onlineMenu.innerHTML = '';

  // Ajouter tous les utilisateurs en ligne
  datas.forEach((data) => {
    // Ne pas afficher l'utilisateur actuel dans la liste
    if (true) {
      // Création du nouvel élément <li>
      const listItem = document.createElement("li");
      listItem.id = data.session_id;
      listItem.dataset.userId = data.user_id; // Stocker l'ID utilisateur dans un attribut data
      
      // Création de la div contenant le SVG + Nom de l'utilisateur
      listItem.innerHTML = `
        <div class="a connected-user">
          <svg role="img" width="24px" viewBox="0 0 24 24" aria-label="icon">
            <g fill="var(--greenFill)">
              <path d="M18.9773 8.99844L10.7749 17.4458L5.22394 12.2751L5.85311 11.5997L10.7425 16.1542L18.3151 8.3554L18.9773 8.99844Z"></path>
              <path d="M12.0001 2.67692C6.85107 2.67692 2.67698 6.85101 2.67698 12C2.67698 17.149 6.85107 21.3231 12.0001 21.3231C17.1491 21.3231 21.3231 17.149 21.3231 12C21.3231 6.85101 17.1491 2.67692 12.0001 2.67692ZM1.75391 12C1.75391 6.3412 6.34127 1.75385 12.0001 1.75385C17.6589 1.75385 22.2462 6.3412 22.2462 12C22.2462 17.6588 17.6589 22.2462 12.0001 22.2462C6.34127 22.2462 1.75391 17.6588 1.75391 12Z"></path>
            </g>
          </svg>
          ${data.username}
        </div>
      `;

      listItem.addEventListener("click", () => {
        const main = document.querySelector("main");
        
        // Si c'est une nouvelle conversation, nettoyer l'ancienne
        if (main.dataset.userId !== data.user_id) {
          // Informer le serveur du changement de conversation
          switchChat(data.user_id);
          
          // Définir l'ID utilisateur de la conversation actuelle
          main.dataset.userId = data.user_id;
          
          // Mettre à jour l'interface
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
          <div class="chat-header">${data.username}</div>
          <div class="chat-messages"></div>
          <div id="new-msg-container">
            <input id="message" type="text" placeholder="Message ..."></input>
            <button id="send-msg">Send</button> 
          </div>;`

          // Charger l'historique des messages
          loadChatHistory(data.user_id);
          
          let sendBtn = document.getElementById("send-msg");
          let messageInput = document.getElementById("message");
          
          sendBtn.addEventListener("click", () => {
            sendMessage();
          });// Permettre l'envoi du message avec Entrée
          messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          });
        }
      });

      // Ajoute l'élément à la liste
      onlineMenu.appendChild(listItem);
    }
  });
  
  // Mettre à jour les badges de notification
  datas.forEach(data => {
    if (data.user_id !== userId) {
      updateNotificationBadge(data.user_id);
    }
  });
}

// Ajouter des styles CSS pour les notifications et messages
export function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .message-sent, .message-received {
      margin: 8px;
      padding: 10px;
      border-radius: 18px;
      max-width: 70%;
      word-wrap: break-word;
    }
    
    .message-sent {
      background-color: #dcf8c6;
      align-self: flex-end;
      margin-left: auto;
    }
    
    .message-received {
      background-color: #f1f0f0;
      align-self: flex-start;
      margin-right: auto;
    }
    
    .chat-messages {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      height: calc(100% - 130px);
      padding: 10px;
    }
    
    .chat-header {
      background-color: #075e54;
      color: white;
      padding: 10px;
      text-align: center;
      font-weight: bold;
    }
    
    .message-time {
      font-size: 0.7em;
      color: #999;
      text-align: right;
      margin-top: 2px;
    }
    
    .notification-badge {
      background-color: #FF4136;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      position: absolute;
      top: 0;
      right: 0;
      font-weight: bold;
    }
    
    .connected-user {
      position: relative;
    }
    
    main {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    #new-msg-container {
      display: flex;
      padding: 10px;
      background-color: #f0f0f0;
    }
    
    #message {
      flex: 1;
      padding: 10px;
      border-radius: 20px;
      border: 1px solid #ddd;
      margin-right: 10px;
    }
    
    #send-msg {
      background-color: #075e54;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 0 15px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

// Appeler cette fonction au chargement pour ajouter les styles
document.addEventListener('DOMContentLoaded', addStyles);