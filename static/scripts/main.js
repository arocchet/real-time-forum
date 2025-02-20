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