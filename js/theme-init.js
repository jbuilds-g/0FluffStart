(function () {
  try {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.add(savedTheme);
  } catch (error) {
    // Keep the default page theme if local storage is unavailable.
  }
})();
