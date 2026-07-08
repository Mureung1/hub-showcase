const navButtons = document.querySelectorAll(".nav-button");
const screens = document.querySelectorAll(".screen");
const screenTitle = document.querySelector("#screen-title");

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;

    // Show only the selected section without reloading the page.
    screens.forEach((screen) => {
      screen.classList.toggle("active-screen", screen.id === targetId);
    });

    navButtons.forEach((navButton) => {
      navButton.classList.toggle("active", navButton === button);
    });

    screenTitle.textContent = button.dataset.title;
  });
});
