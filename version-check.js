document.addEventListener("DOMContentLoaded", () => {
  const betaNotice = document.getElementById("betaNotice");
  const closeBetaBtn = document.getElementById("closeBetaBtn");
  const currentBetaVersion = "v1.4.0.beta4";

  // Check if user has already seen this specific version
  if (localStorage.getItem("0fluff_beta_acknowledged") !== currentBetaVersion) {
    setTimeout(() => {
      if (betaNotice) {
        betaNotice.classList.remove("hidden");
      }
    }, 1000);
  }

  // Handle the "Got it" button click
  if (closeBetaBtn) {
    closeBetaBtn.addEventListener("click", () => {
      localStorage.setItem("0fluff_beta_acknowledged", currentBetaVersion);
      if (betaNotice) {
        betaNotice.classList.add("hidden");
      }
    });
  }
});
