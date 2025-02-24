// Theme
const themeSwitch = document.getElementById('switch-theme');
const themeIcon = document.getElementById('theme-icon');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

function setThemeIcons() {
  if (document.body.classList.contains('dark-theme')) {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  } else {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
}

setThemeIcons();

themeSwitch.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');

  setThemeIcons();
});

// Modal
const loginButton = document.getElementById('login-btn');
const postButton = document.getElementById('new-post');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');

// Contenus pour chaque modal
const loginContent = `
  <h2>Login</h2>
  <form id="login-form">
    <label for="username">Username:</label>
    <input class="modal-input" type="text" id="username" name="username" required><br><br>
    <label for="password">Password:</label>
    <input class="modal-input" type="password" id="password" name="password" required><br><br>
    <button class="modal-btn" type="submit">Login</button>
  </form>
`;

const registerContent = `
  <h2>Register</h2>
  <form id="register-form">
    <label for="reg-username">Username:</label>
    <input class="modal-input" type="text" id="reg-username" name="reg-username" required><br><br>
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
    <input class="modal-input" type="text" id="post-title" name="post-title" required><br><br>
    <label for="post-category">Category:</label>
    <input class="modal-input" type="text" id="post-category" name="post-category" required><br><br>
    <label for="post-body">Content:</label><br>
    <textarea class="modal-area" id="post-body" name="post-body" rows="4" cols="50" required></textarea><br><br>
    <button class="modal-btn" type="submit">Post</button>
  </form>
`;

// Contenus du footer pour basculer entre Login et Register
const loginFooter = `
  <p>Don't have an account? <a class="modal-href" href="#" id="switch-to-register">Register</a></p>
`;

const registerFooter = `
  <p>Already have an account? <a class="modal-href" href="#" id="switch-to-login">Login</a></p>
`;

// Fonction pour envoyer des données à l'API
async function sendData(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error in API request');
    }

    const result = await response.json();
    console.log('Success:', result);
    alert('Request was successful!');
  } catch (error) {
    console.error('Error:', error);
    alert('There was an error with the request.');
  }
}

// Ouvrir le modal et afficher le bon contenu selon le bouton cliqué
loginButton.addEventListener('click', () => {
  modalBody.innerHTML = loginContent;
  modalFooter.innerHTML = loginFooter;
  modal.style.display = 'block';
});

// Afficher le formulaire "New Post"
postButton.addEventListener('click', () => {
  modalBody.innerHTML = postContent; 
  modalFooter.innerHTML = '';
  modal.style.display = 'block';
});

// Fermer le modal si on clique sur la croix
closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Fermer le modal si on clique en dehors de la fenêtre du modal
window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Gérer le switch entre Login et Register
document.addEventListener('click', (event) => {
  if (event.target && event.target.id === 'switch-to-register') {
    modalBody.innerHTML = registerContent;
    modalFooter.innerHTML = registerFooter;
  } else if (event.target && event.target.id === 'switch-to-login') {
    modalBody.innerHTML = loginContent;
    modalFooter.innerHTML = loginFooter;
  }
});

// Envoyer les données de Login à l'API
document.addEventListener('submit', (event) => {
  if (event.target && event.target.id === 'login-form') {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const loginData = {
      username,
      password,
    };

    sendData('http://localhost:8088/api/login', loginData); // Envoi des données de login
  }

  if (event.target && event.target.id === 'register-form') {
    event.preventDefault();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const registerData = {
      username,
      email,
      password,
    };

    sendData('http://localhost:8088/api/register', registerData); // Envoi des données d'inscription
  }

  if (event.target && event.target.id === 'post-form') {
    event.preventDefault();

    const title = document.getElementById('post-title').value;
    const category = document.getElementById('post-category').value;
    const body = document.getElementById('post-body').value;

    const postData = {
      title,
      category,
      body,
    };

    sendData('http://localhost:8088/api/post', postData); // Envoi des données de post
  }
});
