const main = document.querySelector("main");

export function SetUserClickEvent() {
  const users = document.querySelectorAll("div.a.connected-user");
  const logoutBtn = document.getElementById("logout-btn");
  users.forEach((user) => {
    user.addEventListener("click", () => {
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
  });
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
}
