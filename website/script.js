/* StrideTrack Website – JavaScript */

// ---- Scroll-based fade-in animation ----
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.feature-card, .data-card, .download-card, .hc-card, .install-steps, .privacy-banner').forEach((el) => {
  el.classList.add('fade-up');
  observer.observe(el);
});

// ---- Navbar shadow on scroll ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    navbar.style.boxShadow = '0 4px 0 0 #000';
  } else {
    navbar.style.boxShadow = '0 3px 0 0 #000';
  }
});

// ---- Smooth active nav link highlighting ----
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => link.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);

sections.forEach((section) => sectionObserver.observe(section));

// ---- Button click feedback ----
document.querySelectorAll('.btn').forEach((btn) => {
  btn.addEventListener('mousedown', () => {
    if (!btn.disabled) {
      btn.style.transition = 'none';
    }
  });
  btn.addEventListener('mouseup', () => {
    btn.style.transition = '';
  });
});

