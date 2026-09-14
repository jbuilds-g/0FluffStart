import "./main.js";

document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".settings-section-nav");
  const sections = Array.from(document.querySelectorAll(".settings-section"));

  if (!nav || !sections.length) return;

  const navLinks = Array.from(nav.querySelectorAll("a[href^='#']"));
  const setActiveSection = (id) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      link.setAttribute("aria-current", active ? "location" : "false");
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
