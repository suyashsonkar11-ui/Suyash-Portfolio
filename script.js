/**
 * SUYASH SONKAR - PORTFOLIO INTERACTION & SCROLL ANIMATION ENGINE
 * Features:
 * 1. Hardware-Accelerated WebGL/2D Canvas Scroll-Scrubbing (300 frames)
 * 2. Real-time GPU Black-Chroma Keying & Grayscale Filter (Text behind character)
 * 3. Smooth Lerp Animation Loop with High-DPI Display Support
 * 4. Dynamic Active Navbar Tracking & Scroll-driven Hero Title Fade
 * 5. Real-time Header Clock (IST) & Bi-directional Scroll Reveal Animations
 */

(function () {
  'use strict';

  const FRAME_COUNT = 300;
  const FOLDER_PATH = 'website';
  const FRAME_PREFIX = 'ezgif-frame-';
  const FRAME_EXTENSION = '.jpg';

  const canvas = document.getElementById('scrollCanvas');
  if (!canvas) return;

  const canvasWrapper = document.querySelector('.canvas-wrapper');
  const fallbackImage = document.getElementById('firstFrameFallback');
  const preloader = document.getElementById('preloader');
  const loaderBarFill = document.getElementById('loaderBarFill');
  const loaderText = document.getElementById('loaderText');
  const heroBgLayer = document.getElementById('heroBgLayer');
  const heroSocials = document.querySelector('.hero-socials');
  const heroTagline = document.querySelector('.hero-tagline');

  let gl = null;
  let glProgram = null;
  let glTexture = null;
  let positionBuffer = null;
  let texCoordBuffer = null;
  let isWebGL = false;
  let ctx2d = null;

  // Initialize WebGL for ultra-fast GPU grayscale and transparent black cutout
  function setupRenderer() {
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true }) ||
        canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false, antialias: true });

      if (gl) {
        const vsSource = `
          attribute vec2 a_position;
          attribute vec2 a_texCoord;
          varying vec2 v_texCoord;
          void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
          }
        `;

        const fsSource = `
          #ifdef GL_FRAGMENT_PRECISION_HIGH
          precision highp float;
          #else
          precision mediump float;
          #endif
          uniform sampler2D u_image;
          varying vec2 v_texCoord;
          void main() {
            vec4 color = texture2D(u_image, v_texCoord);
            // Grayscale luminance
            float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            // High-contrast grayscale to match reference image exactly
            float gray = clamp(luma * 1.15, 0.0, 1.0);
            // Smoothly key out pure black studio background (#000000)
            float maxVal = max(color.r, max(color.g, color.b));
            float alpha = smoothstep(0.012, 0.05, maxVal);
            gl_FragColor = vec4(vec3(gray) * alpha, alpha);
          }
        `;

        function createShader(glCtx, type, source) {
          const s = glCtx.createShader(type);
          glCtx.shaderSource(s, source);
          glCtx.compileShader(s);
          if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
            glCtx.deleteShader(s);
            return null;
          }
          return s;
        }

        const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        if (vs && fs) {
          glProgram = gl.createProgram();
          gl.attachShader(glProgram, vs);
          gl.attachShader(glProgram, fs);
          gl.linkProgram(glProgram);

          if (gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
            gl.useProgram(glProgram);

            // Setup Geometry Quad
            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
              -1.0, -1.0,
              1.0, -1.0,
              -1.0, 1.0,
              -1.0, 1.0,
              1.0, -1.0,
              1.0, 1.0,
            ]), gl.STATIC_DRAW);

            // Setup Texture Coordinates (flip Y for WebGL)
            texCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
              0.0, 1.0,
              1.0, 1.0,
              0.0, 0.0,
              0.0, 0.0,
              1.0, 1.0,
              1.0, 0.0,
            ]), gl.STATIC_DRAW);

            glTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

            isWebGL = true;
          }
        }
      }
    } catch (e) {
      isWebGL = false;
    }

    if (!isWebGL) {
      ctx2d = canvas.getContext('2d', { alpha: true });
    }
  }

  function hideFallbackImage() {
    if (fallbackImage) {
      fallbackImage.style.display = 'none';
    }
    if (canvasWrapper) {
      canvasWrapper.classList.add('is-animated');
    }
  }

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let preloaderHidden = false;

  function getFrameUrl(index) {
    const paddedIndex = String(index + 1).padStart(3, '0');
    return `${FOLDER_PATH}/${FRAME_PREFIX}${paddedIndex}${FRAME_EXTENSION}`;
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (isWebGL && gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    } else if (ctx2d) {
      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = 'high';
    }

    renderFrame(Math.round(currentFrame));
  }

  function drawImageFrame(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const renderWidth = Math.round(imgWidth * scale);
    const renderHeight = Math.round(imgHeight * scale);
    const offsetX = Math.round((canvasWidth - renderWidth) / 2);
    const offsetY = Math.round((canvasHeight - renderHeight) / 2);

    if (isWebGL && gl && glProgram) {
      gl.viewport(offsetX, offsetY, renderWidth, renderHeight);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(glProgram);

      const aPosLoc = gl.getAttribLocation(glProgram, 'a_position');
      gl.enableVertexAttribArray(aPosLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

      const aTexLoc = gl.getAttribLocation(glProgram, 'a_texCoord');
      gl.enableVertexAttribArray(aTexLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

      const uImgLoc = gl.getUniformLocation(glProgram, 'u_image');
      gl.uniform1i(uImgLoc, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (ctx2d) {
      ctx2d.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx2d.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
    }
  }

  function renderFrame(frameIdx) {
    const targetIdx = Math.max(0, Math.min(FRAME_COUNT - 1, frameIdx));
    let img = images[targetIdx];

    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < FRAME_COUNT; offset++) {
        const prev = targetIdx - offset;
        const next = targetIdx + offset;
        if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
          img = images[prev];
          break;
        }
        if (next < FRAME_COUNT && images[next] && images[next].complete && images[next].naturalWidth > 0) {
          img = images[next];
          break;
        }
      }
    }

    if (img && img.complete) {
      drawImageFrame(img);
    }
  }

  function updateTargetFrame() {
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    const maxScroll = Math.max(1, docHeight - window.innerHeight);
    const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));
    targetFrame = scrollFraction * (FRAME_COUNT - 1);

    // Fade out hero background title and tagline smoothly as user scrolls past hero section
    const fadeThreshold = window.innerHeight * 0.45;
    const heroOpacity = Math.max(0, Math.min(1, 1 - (scrollTop / fadeThreshold)));
    if (heroBgLayer) heroBgLayer.style.opacity = heroOpacity.toFixed(3);
    if (heroSocials) heroSocials.style.opacity = heroOpacity.toFixed(3);
    if (heroTagline) heroTagline.style.opacity = heroOpacity.toFixed(3);
  }

  function animate() {
    updateTargetFrame();

    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * 0.12;
      renderFrame(Math.round(currentFrame));
    } else {
      currentFrame = targetFrame;
      renderFrame(Math.round(currentFrame));
    }

    requestAnimationFrame(animate);
  }

  function preloadImages() {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);

      img.onload = () => {
        loadedCount++;
        images[i] = img;

        if (i === 0) {
          renderFrame(0);
          hideFallbackImage();
        }

        const percent = Math.floor((loadedCount / FRAME_COUNT) * 100);
        if (loaderBarFill) loaderBarFill.style.width = `${percent}%`;
        if (loaderText) loaderText.textContent = `${percent}%`;

        if (loadedCount >= 8 && !preloaderHidden) {
          hidePreloader();
        }

        if (loadedCount === FRAME_COUNT && !preloaderHidden) {
          hidePreloader();
        }
      };

      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= 8 && !preloaderHidden) {
          hidePreloader();
        }
      };
    }
  }

  function hidePreloader() {
    preloaderHidden = true;
    if (preloader) {
      preloader.classList.add('hidden');
    }
  }

  // Active Nav Link Tracker on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    const scrollPosition = window.scrollY + 200;
    let activeFound = false;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (!activeFound && scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
        });
        activeFound = true;
      }
    });

    if (!activeFound && (window.scrollY < 100)) {
      navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#home'));
    }
  }

  // Real-time Clock for About Header
  function updateLiveTime() {
    const timeEl = document.getElementById('liveTime');
    if (!timeEl) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    timeEl.textContent = `${timeStr}, IST`;
  }

  // Bi-directional Scroll Reveal Animations
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupRevealAnimations() {
    const elementsToAnimate = document.querySelectorAll(
      '.about-top-bar, .about-middle-content, .about-bottom-bar, ' +
      '.resume-col, .speaker-top-row, .speaker-title-wrapper, .portfolio-item, .contact-header-container, .contact-form, .footer'
    );

    elementsToAnimate.forEach((el) => {
      el.classList.add('reveal-item');
    });

    if (prefersReducedMotion) {
      elementsToAnimate.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            if (entry.boundingClientRect.top > 0) {
              entry.target.classList.remove('is-visible');
            }
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    elementsToAnimate.forEach((el) => observer.observe(el));
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', () => {
    updateTargetFrame();
    updateActiveNav();
  }, { passive: true });

  // Init
  setupRenderer();
  resizeCanvas();
  preloadImages();
  animate();
  updateLiveTime();
  setInterval(updateLiveTime, 1000);
  setupRevealAnimations();
  updateActiveNav();
})();

/* ==========================================================================
   FLEEING INTRO PILL — Cursor-repelled button interaction
   ========================================================================== */
(function () {
  'use strict';

  const pill = document.getElementById('fleeingPill');
  if (!pill) return;

  // Skip on touch devices
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) return;

  const PROXIMITY = 80;  // Distance in px that triggers a flee
  const COOLDOWN = 400;  // Min ms between moves
  let lastMove = 0;
  let offsetX = 0;
  let offsetY = 0;

  function flee(e) {
    const now = Date.now();
    if (now - lastMove < COOLDOWN) return;

    const rect = pill.getBoundingClientRect();
    const pillCX = rect.left + rect.width / 2;
    const pillCY = rect.top + rect.height / 2;

    const dx = e.clientX - pillCX;
    const dy = e.clientY - pillCY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > PROXIMITY) return;

    // Get parent bounds to keep pill inside
    const parent = pill.closest('.about-bottom-bar') || pill.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const section = pill.closest('.section-about-new');
    const sectionRect = section ? section.getBoundingClientRect() : parentRect;

    // Max bounds (use the tighter of parent/section, with padding)
    const pad = 20;
    const minX = sectionRect.left + pad - (rect.left - offsetX);
    const maxX = sectionRect.right - pad - rect.width - (rect.left - offsetX);
    const minY = sectionRect.top + pad - (rect.top - offsetY);
    const maxY = sectionRect.bottom - pad - rect.height - (rect.top - offsetY);

    // Move away from cursor: random angle biased opposite to cursor
    const baseAngle = Math.atan2(-dy, -dx);
    const spread = (Math.random() - 0.5) * Math.PI * 0.8;
    const angle = baseAngle + spread;
    const moveDist = 120 + Math.random() * 80;

    let newX = offsetX + Math.cos(angle) * moveDist;
    let newY = offsetY + Math.sin(angle) * moveDist;

    // Clamp within bounds
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    offsetX = newX;
    offsetY = newY;
    lastMove = now;

    // Apply with random subtle rotation
    const rot = (Math.random() - 0.5) * 6;
    pill.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(0.94) rotate(${rot}deg)`;
    pill.classList.add('is-fleeing');

    setTimeout(() => {
      pill.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1) rotate(0deg)`;
      pill.classList.remove('is-fleeing');
    }, 300);
  }

  document.addEventListener('mousemove', flee, { passive: true });
})();

/* ==========================================================================
   ABOUT SECTION CAROUSEL — HR & Marketing 2-Slide Loop Controller
   ========================================================================== */
(function () {
  'use strict';

  const viewport = document.getElementById('aboutCarouselViewport');
  const arrowLeft = document.getElementById('aboutArrowLeft');
  const arrowRight = document.getElementById('aboutArrowRight');
  const slides = document.querySelectorAll('.about-slide');

  if (!viewport || slides.length < 2 || !arrowLeft || !arrowRight) return;

  let currentIndex = 0;
  let isTransitioning = false;
  const TRANSITION_DURATION = 600; // ms

  function goToSlide(nextIndex, direction) {
    if (isTransitioning || nextIndex === currentIndex) return;
    isTransitioning = true;

    const currentSlide = slides[currentIndex];
    const targetSlide = slides[nextIndex];

    // Clean up all transient animation classes first
    slides.forEach(s => {
      s.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right');
    });

    if (direction === 'next') {
      // Current moves OUT to LEFT, Target enters from RIGHT
      targetSlide.classList.add('slide-in-right');
      void targetSlide.offsetWidth; // Force layout recalculation

      currentSlide.classList.add('slide-out-left');
      targetSlide.classList.remove('slide-in-right');
      targetSlide.classList.add('active');
    } else {
      // Current moves OUT to RIGHT, Target enters from LEFT
      targetSlide.classList.add('slide-in-left');
      void targetSlide.offsetWidth; // Force layout recalculation

      currentSlide.classList.add('slide-out-right');
      targetSlide.classList.remove('slide-in-left');
      targetSlide.classList.add('active');
    }

    setTimeout(() => {
      currentSlide.classList.remove('active', 'slide-out-left', 'slide-out-right');
      targetSlide.classList.remove('slide-in-left', 'slide-in-right');
      currentIndex = nextIndex;
      isTransitioning = false;
    }, TRANSITION_DURATION);
  }

  function handleNext() {
    const nextIndex = (currentIndex + 1) % slides.length;
    goToSlide(nextIndex, 'next');
  }

  function handlePrev() {
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
    goToSlide(prevIndex, 'prev');
  }

  arrowRight.addEventListener('click', (e) => {
    e.preventDefault();
    handleNext();
  });

  arrowLeft.addEventListener('click', (e) => {
    e.preventDefault();
    handlePrev();
  });

  // Touch / Swipe support for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Minimum swipe threshold (40px) and ensure horizontal intent
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swiped Left -> Go Next (HR -> Marketing)
        handleNext();
      } else {
        // Swiped Right -> Go Prev (Marketing -> HR)
        handlePrev();
      }
    }
  }, { passive: true });
})();

/* ==========================================================================
   CONTACT FORM SUBMISSION CONTROLLER — Direct to suyashsonkar11@gmail.com
   ========================================================================== */
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnArrow = document.getElementById('btnArrow');
  const formStatus = document.getElementById('formStatus');

  if (!form || !submitBtn) return;

  const nameInput = document.getElementById('userName');
  const emailInput = document.getElementById('userEmail');
  const phoneInput = document.getElementById('userNumber');
  const needSelect = document.getElementById('primaryNeed');
  const messageInput = document.getElementById('userMessage');

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showStatus(type, title, desc) {
    if (!formStatus) return;
    formStatus.className = 'form-status-message ' + (type === 'success' ? 'is-success' : 'is-error');
    formStatus.innerHTML = `<strong class="status-title">${title}</strong><span class="status-desc">${desc}</span>`;
    formStatus.style.display = 'block';
  }

  function clearStatus() {
    if (!formStatus) return;
    formStatus.className = 'form-status-message';
    formStatus.innerHTML = '';
    formStatus.style.display = 'none';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearStatus();

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const need = needSelect ? needSelect.value : '';
    const message = messageInput ? messageInput.value.trim() : '';

    // Field Validations
    if (!name) {
      if (nameInput) nameInput.focus();
      showStatus('error', 'NAME REQUIRED', 'Please enter your name.');
      return;
    }

    if (!email || !validateEmail(email)) {
      if (emailInput) emailInput.focus();
      showStatus('error', 'VALID EMAIL REQUIRED', 'Please enter a valid email address.');
      return;
    }

    if (!message) {
      if (messageInput) messageInput.focus();
      showStatus('error', 'MESSAGE REQUIRED', 'Please enter your message or hiring inquiry.');
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    const originalText = btnText ? btnText.textContent : 'Send Message';
    if (btnText) btnText.textContent = 'Sending...';
    if (btnArrow) btnArrow.textContent = '⏳';

    try {
      const response = await fetch('https://formsubmit.co/ajax/suyashsonkar11@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          Name: name,
          Email: email,
          Phone: phone || 'Not provided',
          'Primary Need': need || 'General Inquiry',
          Message: message,
          _subject: `New Portfolio Inquiry from ${name}`,
          _template: 'table',
          _captcha: 'false'
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok || data.success === 'true' || data.success === true) {
        showStatus(
          'success',
          'MESSAGE SENT SUCCESSFULLY',
          'Thank you for reaching out. I’ll get back to you soon.'
        );
        form.reset();
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err) {
      console.error('Contact Form Error:', err);
      showStatus(
        'error',
        'MESSAGE COULD NOT BE SENT',
        'Please try again or contact me directly by email at suyashsonkar11@gmail.com.'
      );
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.textContent = originalText;
      if (btnArrow) btnArrow.textContent = '→';
    }
  });
})();


