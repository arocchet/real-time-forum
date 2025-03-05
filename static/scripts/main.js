import { LoadCategories } from "./loadcategories.js";
import { DisplayPosts, LoadPosts } from "./loadposts.js";
import { connect, disconnect, getOnlineUsers, sendMessage } from "./websocket.js";

// Theme Switch
const logoutBtn = document.getElementById("logout-btn");
const themeSwitch = document.getElementById("switch-theme");
const sunIcon = document.getElementById("sun-icon");
const moonIcon = document.getElementById("moon-icon");
const main = document.querySelector("main");

function setThemeIcons() {
  if (document.body.classList.contains("dark-theme")) {
    sunIcon.style.display = "block";
    moonIcon.style.display = "none";
  } else {
    sunIcon.style.display = "none";
    moonIcon.style.display = "block";
  }
}

// Fonction qui vérifie la présence du cookie "session"
function checkSessionCookie() {
  const sessionCookie = document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith("session="));

  if (sessionCookie) {
    logoutBtn.style.display = "flex";
  } else {
    logoutBtn.style.display = "none";
  }
}

//variable
let categories = {};

function throttle(mainFunction, delay) {
  let timerFlag = null;
  return (...args) => {
    if (timerFlag === null) {
      mainFunction(...args);
      timerFlag = setTimeout(() => {
        timerFlag = null;
      }, delay);
    }
  };
}

let throttleScroll = throttle(async () => {
  if (!main.dataset.userId) {
    let p = await LoadPosts();
    DisplayPosts(p, categories);
  }
}, 3000);

window.addEventListener("DOMContentLoaded", async (event) => {
  setThemeIcons();

  // Connexion au websocket
  connect();
  getOnlineUsers();

  // Charger les catégories
  categories = await LoadCategories();
  checkSessionCookie();

  // Afficher les posts
  const posts = await LoadPosts();
  DisplayPosts(posts, categories);

  setInterval(() => {
    console.log("passage dans l'interval");
    getOnlineUsers();
  }, 3000);

  setTimeout(() => {
    document.addEventListener("scroll", throttleScroll);
  }, 1000);
});

themeSwitch.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  setThemeIcons();
});

// Modal
const loginButton = document.getElementById("login-btn");
const postButton = document.getElementById("new-post");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("close-modal");
const modalHeader = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalFooter = document.getElementById("modal-footer");

// Contenus pour chaque modal
export const loginContent = `
  <h2>Login</h2>
  <form id="login-form">
    <label for="email">Email or Username:</label>
    <input class="modal-input" type="text" id="email" name="email" required><br><br>
    <label for="password">Password:</label>
    <input class="modal-input" type="password" id="password" name="password" required><br><br>
    <button class="modal-btn" type="submit">Login</button>
  </form>
`;

export const registerContent = `
  <h2>Register</h2>
  <form id="register-form">
    <label for="reg-username">Username:</label>
    <input class="modal-input" type="text" id="reg-username" name="reg-username" required><br><br>

    <label for="reg-firstname">First Name:</label>
    <input class="modal-input" type="text" id="reg-firstname" name="reg-firstname" required><br><br>

    <label for="reg-lastname">Last Name:</label>
    <input class="modal-input" type="text" id="reg-lastname" name="reg-lastname" required><br><br>

    <label for="reg-gender">Gender:</label>
    <select class="modal-input" id="reg-gender" name="reg-gender" required>
      <option value="">Select</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Other">Other</option>
    </select><br><br>

    <label for="reg-age">Age:</label>
    <input class="modal-input" type="number" id="reg-age" name="reg-age" required><br><br>

    <label for="reg-email">Email:</label>
    <input class="modal-input" type="email" id="reg-email" name="reg-email" required><br><br>

    <label for="reg-password">Password:</label>
    <input class="modal-input" type="password" id="reg-password" name="reg-password" required><br><br>

    <button class="modal-btn" type="submit">Register</button>
  </form>
`;

const postContent = `
  <h2>New Post</h2>
  <form id="post-form">
    <label for="post-title">Title:</label>
    <input class="modal-input" type="text" id="post-title" name="post-title" maxlength="20" required><br><br>
    <label for="post-category">Category:</label>
    <input class="modal-input" type="text" id="post-category" name="post-category" maxlength="20" required><br><br>
    <label for="post-body">Content:</label><br>
    <textarea class="modal-area" id="post-body" name="post-body" rows="4" cols="50" maxlength="200" required></textarea><br><br>
    <button class="modal-btn" type="submit">Post</button>
  </form>
`;

// Contenus du footer pour basculer entre Login et Register
export const loginFooter = `
  <p>Don't have an account? <a class="modal-href" href="#" id="switch-to-register">Register</a></p>
`;

export const registerFooter = `
  <p>Already have an account? <a class="modal-href" href="#" id="switch-to-login">Login</a></p>
`;

// Fonction pour envoyer des données à l'API
async function sendData(url, data, login = false) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Error in API request");
    }

    modal.style.display = "none";
    if (login) {
      logoutBtn.style.display = "flex";
      connect();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("There was an error with the request.");
  }
}

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

export const loginForm = () => {
  modalHeader.innerHTML = "";
  modalBody.innerHTML = loginContent;
  modalFooter.innerHTML = loginFooter;
  modal.style.display = "block";
};

// Ouvrir le modal et afficher le bon contenu selon le bouton cliqué
loginButton.addEventListener("click", () => {
  loginForm();
});

postButton.addEventListener("click", async () => {
  if (
    !document.cookie.split("; ").some((cookie) => cookie.startsWith("session="))
  ) {
    modalHeader.innerHTML = "";

    modalBody.innerHTML = loginContent;
    modalFooter.innerHTML = loginFooter;
    modal.style.display = "block";
    console.log("here");
  } else {
    try {
      const response = await fetch("/api/sessions", {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 200) {
        // Si la session est valide, afficher le formulaire "New Post"
        modalHeader.innerHTML = "";

        modalBody.innerHTML = postContent;
        modalFooter.innerHTML = "";
        modal.style.display = "block";
      } else {
        throw new Error("Session invalide");
      }
    } catch (error) {
      document.cookie =
        "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      modalHeader.innerHTML = "";

      modalBody.innerHTML = loginContent;
      modalFooter.innerHTML = loginFooter;
      modal.style.display = "block";
    }
  }
});

// Fermer le modal si on clique sur la croix
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});

// Fermer le modal si on clique en dehors de la fenêtre du modal
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
});

// Gérer le switch entre Login et Register
document.addEventListener("click", (event) => {
  if (event.target && event.target.id === "switch-to-register") {
    modalHeader.innerHTML = "";

    modalBody.innerHTML = registerContent;
    modalFooter.innerHTML = registerFooter;
  } else if (event.target && event.target.id === "switch-to-login") {
    modalHeader.innerHTML = "";

    modalBody.innerHTML = loginContent;
    modalFooter.innerHTML = loginFooter;
  }
});

// Envoyer les données de Login à l'API
document.addEventListener("submit", async (event) => {
  if (event.target && event.target.id === "login-form") {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const loginData = {
      email,
      password,
    };

    sendData("http://localhost:8080/api/login", loginData, true); // Envoi des données de login
  }

  if (event.target && event.target.id === "register-form") {
    event.preventDefault();

    const registerData = {
      username: document.getElementById("reg-username").value,
      firstname: document.getElementById("reg-firstname").value,
      lastname: document.getElementById("reg-lastname").value,
      gender: document.getElementById("reg-gender").value,
      age: parseInt(document.getElementById("reg-age").value, 10),
      email: document.getElementById("reg-email").value,
      password: document.getElementById("reg-password").value,
    };

    sendData("http://localhost:8080/api/register", registerData, true); // Envoi des données d'inscription
  }
  if (event.target && event.target.id === "post-form") {
    event.preventDefault();

    const title = document.getElementById("post-title").value;
    const category = document.getElementById("post-category").value;
    const body = document.getElementById("post-body").value;

    const postData = {
      title: title,
      category_name: category,
      content: body,
    };

    await sendData("http://localhost:8080/api/post", postData); // Envoi des données de post

    //reload
    location.reload();
  }
});

function closeAllSubMenus() {
  Array.from(sidebar.getElementsByClassName("show")).forEach((ul) => {
    ul.classList.remove("show");
    ul.previousElementSibling.classList.remove("rotate");
  });
}

const onlineButton = document.getElementById("online-btn");
onlineButton.addEventListener("click", () => {
  toggleSubMenu(onlineButton);
});

function toggleSubMenu(button) {
  if (!button.nextElementSibling.classList.contains("show")) {
    closeAllSubMenus();
  }

  button.nextElementSibling.classList.toggle("show");
  button.classList.toggle("rotate");

  if (sidebar.classList.contains("close")) {
    sidebar.classList.toggle("close");
    toggleButton.classList.toggle("rotate");
  }
}
