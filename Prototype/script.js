const navButtons = document.querySelectorAll(".nav-button");
const screens = document.querySelectorAll(".screen");
const peopleSearch = document.querySelector("#peopleSearch");
const searchDropdown = document.querySelector("#searchDropdown");
const brandButton = document.querySelector("#brandButton");
const themeToggle = document.querySelector("#themeToggle");

const users = [
  {
    username: "jimin.log",
    nickname: "Jimin",
    avatar: "gradient-e",
    cover: "cover-b",
    mood: "soft",
    song: "Garden Song",
    artist: "Phoebe Bridgers",
    line: "Letting the afternoon stay quiet for once.",
    bio: "A soft archive of small days and remembered songs."
  },
  {
    username: "jisu.wav",
    nickname: "Jisu",
    avatar: "gradient-d",
    cover: "cover-f",
    mood: "blue",
    song: "Good Days",
    artist: "SZA",
    line: "Trying to keep the gentle parts close.",
    bio: "Collecting songs for slow walks and late windows."
  },
  {
    username: "yuna.playlist",
    nickname: "Yuna",
    avatar: "gradient-f",
    cover: "cover-c",
    mood: "warm",
    song: "Pink Moon",
    artist: "Nick Drake",
    line: "A short walk after the rain.",
    bio: "Writing little memories beside every track."
  },
  {
    username: "afterglow",
    nickname: "Jin Park",
    avatar: "gradient-b",
    cover: "cover-e",
    mood: "night",
    song: "Fade Into You",
    artist: "Mazzy Star",
    line: "A night when silence felt warmer than words.",
    bio: "Songs for the hours that are hard to explain."
  }
];

function showScreen(targetId, title) {
  screens.forEach((screen) => {
    screen.classList.toggle("active-screen", screen.id === targetId);
  });

  navButtons.forEach((navButton) => {
    navButton.classList.toggle("active", navButton.dataset.target === targetId);
  });

  document.title = `SWIM - ${title}`;
  hideDropdown();
}

function renderSearchResults(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const matchedUsers = users.filter((user) => {
    if (!normalizedQuery) return true;
    return (
      user.username.toLowerCase().includes(normalizedQuery) ||
      user.nickname.toLowerCase().includes(normalizedQuery)
    );
  });

  if (!matchedUsers.length) {
    searchDropdown.innerHTML = '<p class="empty-result">No people found.</p>';
    searchDropdown.classList.add("show");
    return;
  }

  searchDropdown.innerHTML = matchedUsers
    .map((user) => {
      return `
        <button class="dropdown-user" type="button" data-username="${user.username}">
          <div class="avatar ${user.avatar}"></div>
          <div>
            <strong>${user.username}</strong>
            <span>${user.nickname}</span>
          </div>
        </button>
      `;
    })
    .join("");

  searchDropdown.classList.add("show");
}

function hideDropdown() {
  searchDropdown.classList.remove("show");
}

function updateUserProfile(user) {
  const avatar = document.querySelector("#selectedUserAvatar");
  const cover = document.querySelector("#selectedUserCover");

  avatar.className = `avatar profile-avatar ${user.avatar}`;
  cover.className = `album-cover journal-cover ${user.cover}`;
  document.querySelector("#selectedUsername").textContent = user.username;
  document.querySelector("#selectedNickname").textContent = user.nickname;
  document.querySelector("#selectedBio").textContent = user.bio;
  document.querySelector("#selectedUserMood").textContent = user.mood;
  document.querySelector("#selectedUserSong").textContent = user.song;
  document.querySelector("#selectedUserArtist").textContent = user.artist;
  document.querySelector("#selectedUserLine").textContent = user.line;
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.target, button.dataset.title);
  });
});

brandButton.addEventListener("click", () => {
  showScreen("home", "Today's Records");
});

themeToggle.addEventListener("click", () => {
  const root = document.documentElement;
  const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = nextTheme;
});

peopleSearch.addEventListener("focus", () => {
  renderSearchResults(peopleSearch.value);
});

peopleSearch.addEventListener("input", () => {
  renderSearchResults(peopleSearch.value);
});

searchDropdown.addEventListener("click", (event) => {
  const userButton = event.target.closest(".dropdown-user");
  if (!userButton) return;

  const selectedUser = users.find((user) => user.username === userButton.dataset.username);
  if (!selectedUser) return;

  updateUserProfile(selectedUser);
  peopleSearch.value = "";
  showScreen("userProfile", "User Profile");
});

document.addEventListener("click", (event) => {
  const clickedInsideSearch = event.target.closest(".search-wrapper");
  if (!clickedInsideSearch) {
    hideDropdown();
  }
});
