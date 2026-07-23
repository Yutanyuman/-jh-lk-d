const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const menuOverlay = document.querySelector(".menu-overlay");
const menuLinks = document.querySelectorAll(".menu-overlay a");
const heroContent = document.querySelector(".hero-content");
const heroScene = document.querySelector(".hero-scene");
const heroFilm = document.querySelector(".hero-film");
const backToTop = document.querySelector(".back-to-top");

function setMenu(open) {
  body.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  menuOverlay.setAttribute("aria-hidden", String(!open));
}

menuToggle.addEventListener("click", () => {
  setMenu(!body.classList.contains("menu-open"));
});

menuLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(Math.max(value, minimum), maximum);

function smoothstep(start, end, value) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

function updateScrollEffects() {
  const heroRect = heroScene.getBoundingClientRect();
  const scrollDistance = Math.max(heroScene.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-heroRect.top / scrollDistance);
  const filmReveal = smoothstep(0.045, 0.2, progress);
  const secondFrame = smoothstep(0.37, 0.52, progress);
  const thirdFrame = smoothstep(0.66, 0.81, progress);

  heroContent.style.setProperty(
    "--hero-opacity",
    String(1 - smoothstep(0.025, 0.19, progress) * 0.96),
  );
  heroFilm.style.setProperty("--film-presence", String(filmReveal));
  heroFilm.style.setProperty("--film-clip", `${(1 - filmReveal) * 38}%`);
  heroFilm.style.setProperty(
    "--film-clip-x",
    `${(1 - filmReveal) * (window.innerWidth <= 767 ? 7 : 16)}%`,
  );
  heroFilm.style.setProperty("--film-scale", String(1.09 - progress * 0.09));
  heroFilm.style.setProperty("--film-01", String(1 - secondFrame));
  heroFilm.style.setProperty("--film-02", String(secondFrame * (1 - thirdFrame)));
  heroFilm.style.setProperty("--film-03", String(thirdFrame));

  body.classList.toggle(
    "hero-photo-active",
    progress > 0.11 && heroRect.bottom > window.innerHeight * 0.2,
  );
  backToTop.classList.toggle("visible", window.scrollY > 650);
}

let scrollTicking = false;

window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      updateScrollEffects();
      scrollTicking = false;
    });
  },
  { passive: true },
);
window.addEventListener("resize", updateScrollEffects);
updateScrollEffects();

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const track = document.querySelector(".review-track");
const viewport = document.querySelector(".review-viewport");
const dots = [...document.querySelectorAll(".review-dots button")];
const previous = document.querySelector(".review-prev");
const next = document.querySelector(".review-next");
let reviewIndex = 0;
let reviewOffset = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartOffset = 0;
let autoplayTimer;

function maximumReviewOffset() {
  return Math.max(track.scrollWidth - viewport.clientWidth, 0);
}

function offsetForIndex(index) {
  if (dots.length <= 1) return 0;
  return (maximumReviewOffset() * index) / (dots.length - 1);
}

function nearestIndex(offset) {
  const maximum = maximumReviewOffset();
  if (maximum === 0) return 0;
  return Math.round((offset / maximum) * (dots.length - 1));
}

function setReviewOffset(offset) {
  reviewOffset = Math.min(Math.max(offset, 0), maximumReviewOffset());
  track.style.transform = `translate3d(${-reviewOffset}px, 0, 0)`;
}

function updateReviewDots() {
  dots.forEach((dot, index) => {
    const active = index === reviewIndex;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function goToReview(index, wrap = false) {
  if (wrap) {
    reviewIndex = (index + dots.length) % dots.length;
  } else {
    reviewIndex = Math.min(Math.max(index, 0), dots.length - 1);
  }
  setReviewOffset(offsetForIndex(reviewIndex));
  updateReviewDots();
}

function stopAutoplay() {
  window.clearInterval(autoplayTimer);
}

function startAutoplay() {
  stopAutoplay();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  autoplayTimer = window.setInterval(() => goToReview(reviewIndex + 1, true), 5500);
}

previous.addEventListener("click", () => {
  goToReview(reviewIndex - 1, true);
  startAutoplay();
});

next.addEventListener("click", () => {
  goToReview(reviewIndex + 1, true);
  startAutoplay();
});

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    goToReview(index);
    startAutoplay();
  });
});

viewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  isDragging = true;
  dragStartX = event.clientX;
  dragStartOffset = reviewOffset;
  viewport.classList.add("is-dragging");
  track.classList.add("is-dragging");
  viewport.setPointerCapture(event.pointerId);
  stopAutoplay();
});

viewport.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  setReviewOffset(dragStartOffset - (event.clientX - dragStartX));
});

function finishDrag(event) {
  if (!isDragging) return;
  isDragging = false;
  viewport.classList.remove("is-dragging");
  track.classList.remove("is-dragging");
  if (viewport.hasPointerCapture(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId);
  }
  goToReview(nearestIndex(reviewOffset));
  startAutoplay();
}

viewport.addEventListener("pointerup", finishDrag);
viewport.addEventListener("pointercancel", finishDrag);

viewport.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goToReview(reviewIndex - 1, true);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    goToReview(reviewIndex + 1, true);
  }
});

viewport.addEventListener("mouseenter", stopAutoplay);
viewport.addEventListener("mouseleave", startAutoplay);
viewport.addEventListener("focusin", stopAutoplay);
viewport.addEventListener("focusout", startAutoplay);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAutoplay();
  else startAutoplay();
});

window.addEventListener("resize", () => {
  window.requestAnimationFrame(() => goToReview(reviewIndex));
});

goToReview(0);
startAutoplay();
