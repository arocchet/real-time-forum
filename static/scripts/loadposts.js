export async function LoadPosts() {
  let posts = [];
  // Load posts from API endpoint
  try {
    const response = await fetch("/api/post", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Error in API request");
    }
    posts = await response.json();
    console.log(posts);
    return posts;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export function DisplayPosts(posts, categories) {
  const main = document.querySelector("main");
  console.log(typeof posts);

  if (!posts) {
    alert("No posts found");
    return;
  }

  Array.from(posts).forEach((post) => {
    const postElement = document.createElement("div");
    postElement.classList.add("post");

    const title = document.createElement("h2");
    title.classList.add("title");
    title.textContent = post.title;

    const category = document.createElement("p");
    category.classList.add("category");
    category.textContent = post.category_name;

    const post_user_name = document.createElement("p");
    post_user_name.classList.add("post-user-name");
    post_user_name.textContent = post.post_user_name;

    const body = document.createElement("p");
    body.classList.add("pos-content");
    body.textContent = post.content;

    const time = document.createElement("p");
    time.classList.add("time");
    const date = new Date(post.date);
    time.textContent = `Posted on ${date.toLocaleString()}`;

    const head = document.createElement("div");
    head.classList.add("post-head");
    head.appendChild(post_user_name);
    head.appendChild(title);
    head.appendChild(category);

    postElement.appendChild(time);
    postElement.appendChild(head);
    postElement.appendChild(body);

    postElement.addEventListener("click", async () => {
      let comments = await GetComments(post.id);
      displayComment(post, comments);
    });

    main.appendChild(postElement);
  });
}

function displayComment(post, comments) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");

  const input = document.createElement("input");
  input.classList.add("comment-input");
  input.setAttribute("type", "text");
  input.setAttribute("placeholder", "Write a comment...");
  modalFooter.appendChild(input);

  const submitBtn = document.createElement("button");
  submitBtn.classList.add("comment-btn");
  submitBtn.textContent = "Send";
  submitBtn.addEventListener("click", async () => {});
  modalFooter.appendChild(submitBtn);

  modal.style.display = "flex";
  modalBody.innerHTML = ``;
  modalFooter.innerHTML = ``;
  modalBody.innerHTML = `<p class="modal-area"> ${
    (JSON.stringify(post), comments)
  } </p>`;
}

async function GetComments(postID) {
  try {
    const response = await fetch(`/api/comment?id=${postID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Error in API request");
    }
    console.log(response);
    return await response.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function sendComment(inputArea) {}
