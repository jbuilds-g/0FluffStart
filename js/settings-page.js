import "./main.js";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("clockDisplay")?.remove();
  document.getElementById("greetingDisplay")?.remove();

  const footer = document.querySelector(".settings-page-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-row footer-row-primary">
        <span class="footer-brand">0FluffStart</span>
        <a href="https://github.com/jbuilds-g/0FluffStart" target="_blank" rel="noopener noreferrer" class="footer-version" title="View Source on GitHub">View Source</a>
        <a href="https://jbuilds-g.github.io/0fluffstart-privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
      </div>
      <div class="footer-row footer-row-secondary">
        <span class="footer-copy">© 2026 • Open source under AGPL-3.0</span>
        <a href="https://github.com/jbuilds-g/0FluffStart/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">AGPL-3.0 License</a>
        <span data-version>v6.4.0</span>
      </div>
    `;
  }

  const nav = document.querySelector(".settings-section-nav");
  const sections = Array.from(document.querySelectorAll(".settings-section"));

  if (!nav || !sections.length) return;

  const navLinks = Array.from(nav.querySelectorAll("a[href^='#']"));
  const setActiveSection = (id) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const updateFromHash = () => {
    const id = window.location.hash.slice(1);
    if (id && sections.some((section) => section.id === id)) {
      setActiveSection(id);
    } else {
      setActiveSection(sections[0].id);
    }
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.slice(1);
      if (id) setActiveSection(id);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    },
    { rootMargin: "-96px 0px -55% 0px", threshold: [0.05, 0.2, 0.5] },
  );

  sections.forEach((section) => observer.observe(section));
  updateFromHash();
  window.addEventListener("hashchange", updateFromHash);
});
