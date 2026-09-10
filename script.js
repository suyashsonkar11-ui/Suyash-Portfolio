/**
 * SUYASH SONKAR — PORTFOLIO ENGINE
 * Features:
 * 1. Minimal Elegant Preloader Screen
 * 2. Active Navigation Tracking & Navbar Scrolled State
 * 3. Mobile Hamburger Drawer Menu
 * 4. Interactive Skills Category Filter Tabs
 * 5. Interactive Form Validation & Feedback
 * 6. About Page HR / Marketing Tab Switcher with Touch Swipe
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. PRELOADER SCREEN DISMISSAL
     ========================================================================== */
  const preloader = document.getElementById('preloader');
  const loaderBarFill = document.getElementById('loaderBarFill');
  const loaderText = document.getElementById('loaderText');

  function hidePreloader() {
    if (!preloader) return;
    if (loaderBarFill) loaderBarFill.style.width = '100%';
    if (loaderText) loaderText.textContent = '100%';
    preloader.classList.add('loaded');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 450);
  }

  // Dismiss preloader smoothly on window load
  if (document.readyState === 'complete') {
    hidePreloader();
  } else {
    window.addEventListener('load', hidePreloader, { once: true });
    setTimeout(hidePreloader, 1200);
  }

  /* ======================================================================
     HERO NAME — Fit the complete name to every viewport width
     ====================================================================== */
  function fitHeroName() {
    const nameBg = document.querySelector('.hero-name-bg');
    const nameWords = nameBg?.querySelectorAll('.hero-name-word');
    if (!nameBg || !nameWords || nameWords.length !== 2) return;

    // Measure at a stable size, then scale the words to 97% of usable width.
    nameBg.style.setProperty('--hero-name-size', '100px');
    const firstWord = nameWords[0].getBoundingClientRect();
    const lastWord = nameWords[nameWords.length - 1].getBoundingClientRect();
    const wordWidth = lastWord.right - firstWord.left;
    const styles = window.getComputedStyle(nameBg);
    const availableWidth = nameBg.clientWidth
      - parseFloat(styles.paddingLeft)
      - parseFloat(styles.paddingRight);

    if (wordWidth > 0 && availableWidth > 0) {
      nameBg.style.setProperty('--hero-name-size', `${Math.floor((availableWidth / wordWidth) * 97)}px`);
    }
  }

  window.addEventListener('resize', fitHeroName, { passive: true });
  window.addEventListener('load', fitHeroName, { once: true });
  if (document.fonts?.ready) document.fonts.ready.then(fitHeroName);
  fitHeroName();

  /* ==========================================================================
     2. NAVIGATION & ACTIVE SECTION HIGHLIGHTING
     ========================================================================== */
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const drawerLinks = document.querySelectorAll('.drawer-link');
  const sections = document.querySelectorAll('section[id]');

  function handleScroll() {
    const scrollY = window.scrollY || window.pageYOffset;

    // Navbar scrolled blur state
    if (navbar) {
      if (scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    // Active link highlighting based on section visibility
    let currentActiveId = 'home';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 140;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentActiveId = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${currentActiveId}`);
    });

    drawerLinks.forEach((link) => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${currentActiveId}`);
    });
  }

  /* ==========================================================================
     3. MOBILE DRAWER MENU
     ========================================================================== */
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');

  function openDrawer() {
    if (mobileDrawer) mobileDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);

  drawerLinks.forEach((link) => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  /* ==========================================================================
     4. SKILLS CATEGORY FILTER TABS
     ========================================================================== */
  const skillTabs = document.querySelectorAll('.skill-tab-btn');
  const skillCards = document.querySelectorAll('.skill-item-card');

  skillTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      skillTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const selectedCategory = tab.getAttribute('data-category');

      skillCards.forEach((card) => {
        const cardCategory = card.getAttribute('data-category');
        if (selectedCategory === 'all' || cardCategory === selectedCategory) {
          card.style.display = 'flex';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  /* ==========================================================================
     5. CONTACT FORM INTERACTION & VALIDATION
     ========================================================================== */
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('userName');
      const emailInput = document.getElementById('userEmail');
      const messageInput = document.getElementById('userMessage');

      if (!nameInput.value.trim() || !emailInput.value.trim() || !messageInput.value.trim()) {
        if (formStatus) {
          formStatus.className = 'form-status-message error';
          formStatus.textContent = 'Please fill in all required fields (Name, Email, Message).';
        }
        return;
      }

      // Simple email format check
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailInput.value.trim())) {
        if (formStatus) {
          formStatus.className = 'form-status-message error';
          formStatus.textContent = 'Please enter a valid email address.';
        }
        return;
      }

      // Simulation of submission
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending Message...</span>';
      }

      setTimeout(() => {
        if (formStatus) {
          formStatus.className = 'form-status-message success';
          formStatus.textContent = '✓ Thank you! Your message has been received. Suyash will respond shortly.';
        }
        contactForm.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Send Message</span> <span class="btn-icon">→</span>';
        }
      }, 1000);
    });
  }

  /* ==========================================================================
     6. FULL-PAGE SCROLL-DRIVEN PORTRAIT ANIMATION (240 FRAMES)
     ========================================================================== */
  (function initPortraitAnimation() {
    const TOTAL_FRAMES = 240;
    const FRAME_PATH = '/Website/ezgif-frame-';
    const RENDER_SCALE = 0.5;
    const canvas = document.getElementById('heroCanvas');
    const fallbackImg = document.getElementById('heroFallbackImg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Frame storage
    const frames = new Array(TOTAL_FRAMES).fill(null);
    let loadedCount = 0;
    let lastDrawnFrame = -1;
    let canvasReady = false;
    let currentSmooth = 0; // smoothed frame index

    // Build frame filename: ezgif-frame-001.jpg ... ezgif-frame-240.jpg
    function frameSrc(index) {
      const num = String(index + 1).padStart(3, '0');
      return FRAME_PATH + num + '.jpg';
    }

    // Resize canvas to match image dimensions
    function setupCanvas(img) {
      if (canvasReady) return;
      // The source sequence has a black studio backdrop. Render at a practical
      // resolution and key that backdrop out so the hero typography remains
      // visible behind the portrait.
      canvas.width = Math.round(img.naturalWidth * RENDER_SCALE);
      canvas.height = Math.round(img.naturalHeight * RENDER_SCALE);

      // Set canvas display size to match the wrapper
      const wrap = canvas.parentElement;
      if (wrap) {
        const wrapH = wrap.clientHeight;
        const aspect = img.naturalWidth / img.naturalHeight;
        canvas.style.height = wrapH + 'px';
        canvas.style.width = (wrapH * aspect) + 'px';
      }
      canvasReady = true;
    }

    function removeDarkBackdrop() {
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = frame.data;

      for (let pixel = 0; pixel < pixels.length; pixel += 4) {
        const brightest = Math.max(pixels[pixel], pixels[pixel + 1], pixels[pixel + 2]);
        if (brightest < 18) {
          pixels[pixel + 3] = 0;
        } else if (brightest < 42) {
          pixels[pixel + 3] = Math.round(((brightest - 18) / 24) * 255);
        }
      }

      ctx.putImageData(frame, 0, 0);
    }

    // Draw a frame on canvas
    function drawFrame(index) {
      if (index === lastDrawnFrame) return;
      const img = frames[index];
      if (!img) {
        // Find nearest loaded frame
        let nearest = -1;
        let minDist = TOTAL_FRAMES;
        for (let i = 0; i < TOTAL_FRAMES; i++) {
          if (frames[i] && Math.abs(i - index) < minDist) {
            minDist = Math.abs(i - index);
            nearest = i;
          }
        }
        if (nearest >= 0 && frames[nearest]) {
          drawFrame(nearest);
        }
        return;
      }

      setupCanvas(img);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      removeDarkBackdrop();
      lastDrawnFrame = index;

      // Hide fallback once canvas is painting
      if (fallbackImg && fallbackImg.style.display !== 'none') {
        fallbackImg.style.display = 'none';
      }
    }

    // Load a single frame, returns Promise
    function loadFrame(index) {
      return new Promise(function (resolve) {
        if (frames[index]) { resolve(); return; }
        const img = new Image();
        img.onload = function () {
          frames[index] = img;
          loadedCount++;
          resolve();
        };
        img.onerror = function () { resolve(); };
        img.src = frameSrc(index);
      });
    }

    // Progressive loading strategy:
    // Phase 1: Load every 10th frame (24 frames) — fast skeleton
    // Phase 2: Load every 5th frame (fill gaps)
    // Phase 3: Load remaining frames
    async function loadAllFrames() {
      // Test if frame path is accessible; if not, show static fallback immediately.
      try {
        const testImg = new Image();
        testImg.src = frameSrc(0);
        await new Promise(function (resolve, reject) {
          testImg.onload = resolve;
          testImg.onerror = reject;
        });
      } catch (e) {
        console.warn('Frame path not accessible, falling back to static image.', e);
        if (fallbackImg) fallbackImg.style.display = 'block';
        if (canvas) canvas.style.display = 'none';
        return;
      }
      // Phase 1: Key frames (every 10th)
      const phase1 = [];
      for (let i = 0; i < TOTAL_FRAMES; i += 10) phase1.push(i);
      // Always include first and last
      if (!phase1.includes(0)) phase1.unshift(0);
      if (!phase1.includes(TOTAL_FRAMES - 1)) phase1.push(TOTAL_FRAMES - 1);

      await Promise.all(phase1.map(loadFrame));

      // Draw first frame immediately
      if (frames[0]) drawFrame(0);

      // Phase 2: Every 5th (skip already loaded)
      const phase2 = [];
      for (let i = 0; i < TOTAL_FRAMES; i += 5) {
        if (!frames[i]) phase2.push(i);
      }
      // Load in batches of 8 to avoid network congestion
      for (let b = 0; b < phase2.length; b += 8) {
        await Promise.all(phase2.slice(b, b + 8).map(loadFrame));
      }

      // Phase 3: All remaining
      const phase3 = [];
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (!frames[i]) phase3.push(i);
      }
      for (let b = 0; b < phase3.length; b += 8) {
        await Promise.all(phase3.slice(b, b + 8).map(loadFrame));
      }
    }

    // Map the entire website scroll range to the complete 240-frame sequence.
    function getTargetFrame() {
      const scrollY = window.scrollY || window.pageYOffset;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const maxScroll = Math.max(1, documentHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
      return Math.floor(progress * (TOTAL_FRAMES - 1));
    }

    // Animation loop with smoothing
    let ticking = false;
    function animate() {
      const target = getTargetFrame();
      // Smooth lerp towards target
      currentSmooth += (target - currentSmooth) * 0.15;
      const frameIndex = Math.round(currentSmooth);
      const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex));
      drawFrame(clampedIndex);

      // Keep animating if not settled
      if (Math.abs(target - currentSmooth) > 0.5) {
        requestAnimationFrame(animate);
      } else {
        ticking = false;
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(animate);
      }
    }

    // Handle window resize — recalculate canvas display size
    function onResize() {
      if (!canvasReady || !frames[0]) return;
      const img = frames[0];
      const wrap = canvas.parentElement;
      if (wrap) {
        const wrapH = wrap.clientHeight;
        const aspect = img.naturalWidth / img.naturalHeight;
        canvas.style.height = wrapH + 'px';
        canvas.style.width = (wrapH * aspect) + 'px';
      }
      lastDrawnFrame = -1; // force redraw
      const target = getTargetFrame();
      drawFrame(Math.max(0, Math.min(TOTAL_FRAMES - 1, target)));
    }

    // Start loading and attach scroll listener
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    loadAllFrames();
    // Sync immediately when the page opens on an anchor or a restored scroll position.
    onScroll();
  })();

  /* ==========================================================================
     7. INITIALIZATION & GLOBAL EVENT LISTENERS
     ========================================================================== */
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  /* ==========================================================================
     8. ABOUT PAGE — HR / MARKETING TAB SWITCHER
     ========================================================================== */
  (function initAboutSwitcher() {
    const tabs = document.querySelectorAll('.switcher-tab');
    const panels = document.querySelectorAll('.switcher-panel');
    if (!tabs.length || !panels.length) return;

    function switchTo(targetPanelId) {
      const activePanel = document.querySelector('.switcher-panel:not(.hidden)');
      const targetPanel = document.getElementById(targetPanelId);
      if (!targetPanel || activePanel === targetPanel) return;

      // Update tab states
      tabs.forEach(function (t) {
        const isTarget = t.dataset.panel === targetPanelId;
        t.classList.toggle('active', isTarget);
        t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });

      // Fade out current panel
      if (activePanel) {
        activePanel.classList.add('fade-out');
        activePanel.addEventListener('transitionend', function onOut() {
          activePanel.removeEventListener('transitionend', onOut);
          activePanel.classList.add('hidden');
          activePanel.classList.remove('fade-out');

          // Fade in target panel
          targetPanel.classList.remove('hidden');
          targetPanel.classList.add('fade-in');
          // Force reflow so transition triggers
          void targetPanel.offsetWidth;
          targetPanel.classList.remove('fade-in');
        }, { once: true });
      } else {
        targetPanel.classList.remove('hidden');
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTo(tab.dataset.panel);
      });
    });

    // Mobile swipe support
    var touchStartX = 0;
    var touchStartY = 0;
    var switcherCard = document.querySelector('.about-switcher-card');
    if (switcherCard) {
      switcherCard.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      switcherCard.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
          // Horizontal swipe detected
          var activeTab = document.querySelector('.switcher-tab.active');
          var allTabs = Array.from(tabs);
          var idx = allTabs.indexOf(activeTab);
          if (dx < 0 && idx < allTabs.length - 1) {
            switchTo(allTabs[idx + 1].dataset.panel);
          } else if (dx > 0 && idx > 0) {
            switchTo(allTabs[idx - 1].dataset.panel);
          }
        }
      }, { passive: true });
    }
  })();

})();
