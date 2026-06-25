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

// ---- Animated counter in hero stats ----
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const isDecimal = String(target).includes('.');
  const from = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = from + (target - from) * eased;
    el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = isDecimal ? target.toFixed(1) : target;
  }
  requestAnimationFrame(update);
}

// Trigger hero stat counters when hero is visible
const heroSection = document.getElementById('hero');
let countersRun = false;

const heroObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !countersRun) {
    countersRun = true;
    // We'll just let CSS handle the hero entrance; counters aren't needed for static numbers
  }
}, { threshold: 0.3 });

if (heroSection) heroObserver.observe(heroSection);

// ---- Smooth active nav link highlighting ----
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.style.color = '';
          link.style.textDecoration = '';
        });
        const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (activeLink) {
          activeLink.style.color = '#23a094';
          activeLink.style.textDecoration = 'underline';
        }
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

// ---- "Coming Soon" Play Store button tooltip ----
const playBtn = document.getElementById('btn-play');
if (playBtn) {
  playBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const tooltip = document.createElement('div');
    tooltip.textContent = '🚀 Coming soon to Google Play!';
    tooltip.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #000;
      color: #ffc900;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      padding: 12px 24px;
      border-radius: 8px;
      border: 2.5px solid #ffc900;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      white-space: nowrap;
    `;
    document.body.appendChild(tooltip);
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => tooltip.remove(), 300);
    }, 2800);
  });
}
