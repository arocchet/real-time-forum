import { loginForm } from "./main.js";

let ws;
let sessionId;
let userId;
let notifications = new Map(); // Pour stocker les notifications par utilisateur
let typingTimeout;
const TYPING_INDICATOR_TIMEOUT = 3000; // 3 seconds

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
    console.error(
      "Erreur lors de la récupération des informations utilisateur:",
      error
    );
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
      const main = document.querySelector("main");
      const currentChatId = main.dataset.userId;

      if (msg.content === "__TYPING__" && msg.sender_id !== userId) {
        showTypingIndicator(msg.sender_id);
        return;
      }

      if (!msg.sender_id || !msg.content) {
        console.log("Message mal formaté :", msg);
        return;
      } else if (msg.content !== "__TYPING__"  && msg.sender_id === userId) {
        displayMessage(msg, true);
        return;
      } else if (msg.content !== "__TYPING__" && currentChatId === msg.sender_id) {
        displayMessage(msg, false);
      } else {
        if (msg.content !== "__TYPING__") {
          showNotification(msg);
        }
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
      unreadCounts.forEach((count) => {
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
  // Recherche d'abord la div de conversation
  const conversationContainer = main.querySelector(".conversation-container");
  const chatMessages =
    conversationContainer || main.querySelector(".chat-messages") || main;

  // Créer un conteneur pour aligner le message correctement
  const messageContainer = document.createElement("div");
  messageContainer.className = isSelf
    ? "message-container message-sent-container"
    : "message-container message-received-container";

  // Créer l'élément de message avec une classe différente selon l'expéditeur
  let messageElement = document.createElement("div");
  messageElement.className = isSelf ? "message-sent" : "message-received";

  // Ajouter le contenu du message
  messageElement.innerHTML = `
    <div class="message-content">${msg.content}</div>
    <div class="message-time">${formatDate(msg.date)}</div>`;

  // Ajouter le message au conteneur
  messageContainer.appendChild(messageElement);

  // Ajouter le conteneur à la zone de chat
  chatMessages.appendChild(messageContainer);

  // Faire défiler vers le bas pour voir le nouveau message
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Formate la date pour l'affichage
function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const userItems = document.querySelectorAll("li[data-user-id]");
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
  const audio = new Audio("/notification.mp3"); // Assurez-vous d'avoir ce fichier
  audio.play().catch((e) => console.log("Erreur de lecture audio:", e));
}

function showTypingIndicator(senderId) {
  const main = document.querySelector("main");
  const currentChatId = main.dataset.userId;

  if (currentChatId === senderId) {
    const typingIndicator = document.getElementById("typing-indicator");
    if (!typingIndicator) {
      const indicator = document.createElement("div");
      indicator.id = "typing-indicator";
      indicator.textContent = "L'autre personne est en train d'écrire...";
      main.appendChild(indicator);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      const indicator = document.getElementById("typing-indicator");
      if (indicator) {
        indicator.remove();
      }
    }, TYPING_INDICATOR_TIMEOUT);
  }
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
    content: "__CHAT_CHANGE__",
  };

  ws.send(JSON.stringify(msg));

  // Effacer les notifications pour cette conversation
  clearNotifications(receiverUserId);
}

// Charge l'historique des messages pour une conversation
export async function loadChatHistory(receiverUserId, offset = 0, limit = 10) {
  try {
    const response = await fetch(
      `/api/chat-history?session_id=${sessionId}&receiver_id=${receiverUserId}&offset=${offset}&limit=${limit}`
    );
    if (response.status === 200) {
      const messages = await response.json();

      const main = document.querySelector("main");
      const conversationContainer = main.querySelector(".conversation-container");

      const initialScrollHeight = conversationContainer.scrollHeight;

      messages.reverse().forEach((msg) => {
        const messageElement = createMessageElement(msg, msg.sender_id === userId);
        if (offset === 0) {
          conversationContainer.appendChild(messageElement);
        } else {
          conversationContainer.insertBefore(messageElement, conversationContainer.firstChild);
        }
      });

      if (offset === 0) {
        conversationContainer.scrollTop = conversationContainer.scrollHeight;
      } else {
        conversationContainer.scrollTop = conversationContainer.scrollHeight - initialScrollHeight;
      }
    }
  } catch (error) {
    console.error("Erreur de chargement de l'historique:", error);
  }
}

function createMessageElement(msg, isSelf) {
  const messageContainer = document.createElement("div");
  messageContainer.className = isSelf
    ? "message-container message-sent-container"
    : "message-container message-received-container";

  let messageElement = document.createElement("div");
  messageElement.className = isSelf ? "message-sent" : "message-received";

  messageElement.innerHTML = `
    <div class="message-content">${msg.content}</div>
    <div class="message-time">${formatDate(msg.date)}</div>`;

  messageContainer.appendChild(messageElement);
  return messageContainer;
}

export function disconnect() {
  if (ws) {
    ws.close();
    console.log("WebSocket fermé");
  }
  window.location.reload();
}

function clearSession() {
  document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

function notifyTyping() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  let msg = {
    sender_id: userId,
    receiver_id: document.querySelector("main").dataset.userId,
    content: "__TYPING__",
  };

  ws.send(JSON.stringify(msg));
}

function setupTypingNotification() {
  const messageInput = document.getElementById("message");
  messageInput.addEventListener("input", () => {
    notifyTyping();
  });
}

function setupScrollListener() {
  const conversationContainer = document.querySelector(".conversation-container");
  conversationContainer.addEventListener("scroll", async () => {
    if (conversationContainer.scrollTop === 0) {
      const main = document.querySelector("main");
      const receiverUserId = main.dataset.userId;
      const currentMessagesCount = conversationContainer.children.length;
      await loadChatHistory(receiverUserId, currentMessagesCount);
    }
  });
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

  // Sort users alphabetically by username
  datas.sort((a, b) => a.username.localeCompare(b.username));

  // Fetch recent messages to prioritize users
  const recentMessagesResponse = await fetch(`/api/recent-messages?session_id=${sessionId}`);
  const recentMessages = await recentMessagesResponse.json();

  console.log("message: ",recentMessages)

  // Create a map to store the last message time for each user
  const lastMessageTimeMap = new Map();
  recentMessages.forEach((msg) => {
    lastMessageTimeMap.set(msg.receiver_id, new Date(msg.date).getTime());
  });

  // Sort users by last message time, then alphabetically
  datas.sort((a, b) => {
    const timeA = lastMessageTimeMap.get(a.user_id) || 0;
    const timeB = lastMessageTimeMap.get(b.user_id) || 0;
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return a.username.localeCompare(b.username);
  });

  // Sélection de la div contenant les utilisateurs en ligne
  const onlineMenu = document.getElementById("sub-online-menu");

  // Nettoyer le menu actuel pour une reconstruction complète
  // (cela évite les problèmes avec les attributs data-user-id)
  onlineMenu.innerHTML = "";

  // Ajouter tous les utilisateurs en ligne
  datas.forEach((data) => {
    // Ne pas afficher l'utilisateur actuel dans la liste
    if (true /*userId !== data.user_id*/) {
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
                <div id="modal" class="modal" style="display: none">
        <div class="modal-content">
          <span id="close-modal" class="close-btn">&times;</span>
          <div id="modal-title"></div>
          <div id="modal-body"></div>
          <div id="modal-footer"></div>
        </div>
      </div>
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
          <div class="chat-header">
            <div class="chat-header-avatar">${data.username.charAt(0)}</div>
            <div class="chat-header-title">${data.username}</div>
          </div>
          <div class="conversation-container"></div>
          <div id="new-msg-container">
            <input id="message" type="text" placeholder="Message ..."></input>
            <button id="send-msg"></button> 
          </div>`;

          // Charger l'historique des messages
          loadChatHistory(data.user_id);

          // Setup typing notification
          setupTypingNotification();

          // Setup scroll listener
          setupScrollListener();

          let sendBtn = document.getElementById("send-msg");
          let messageInput = document.getElementById("message");

          sendBtn.addEventListener("click", () => {
            sendMessage();
          }); // Permettre l'envoi du message avec Entrée
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
  const logoutBtn = document.getElementById("logout-btn");
  logoutBtn.addEventListener("click", async function () {
    try {
      const response = await fetch("http://localhost:8080/api/sessions", {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error("Error in API request");
      }
  
      disconnect();
      document.cookie =
        "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      modal.style.display = "none";
      logoutBtn.style.display = "none";
    } catch (error) {
      console.error("Error:", error);
      alert("There was an error with the request.");
    }
  });
  

  // Mettre à jour les badges de notification
  datas.forEach((data) => {
    if (data.user_id !== userId) {
      updateNotificationBadge(data.user_id);
    }
  });
}
