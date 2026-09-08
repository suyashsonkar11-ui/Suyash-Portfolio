/**
 * SUYASH SONKAR — PORTFOLIO ENGINE
 * Features:
 * 1. Hardware-Accelerated WebGL/2D Canvas Scroll-Scrubbing (240 frames)
 * 2. Natural Color Studio Black-Chroma Keying
 * 3. Smooth LERP Animation Loop with High-DPI Display Support
 * 4. Active Navigation Tracking & Navbar Scrolled State
 * 5. Mobile Hamburger Drawer Menu
 * 6. Interactive Skills Category Filter Tabs
 * 7. Interactive Form Validation & Feedback
 * 8. Smooth Anchor Scrolling & Back to Top
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. SCROLL-DRIVEN 3D CHARACTER ANIMATION (240 FRAMES)
     ========================================================================== */
  const FRAME_COUNT = 240;
  const FOLDER_PATH = 'Website';
  const FRAME_PREFIX = 'ezgif-frame-';
  const FRAME_EXTENSION = '.jpg';

  const canvas = document.getElementById('scrollCanvas');
  const canvasWrapper = document.querySelector('.canvas-wrapper');
  const fallbackImage = document.getElementById('firstFrameFallback');
  const preloader = document.getElementById('preloader');
  const loaderBarFill = document.getElementById('loaderBarFill');
  const loaderText = document.getElementById('loaderText');
  const heroBgLayer = document.getElementById('heroBgLayer');

  let gl = null;
  let glProgram = null;
  let glTexture = null;
  let positionBuffer = null;
  let texCoordBuffer = null;
  let isWebGL = false;
  let ctx2d = null;

  // Setup WebGL with Transparent Black Keyout in Full Natural Vibrant Color
  function setupRenderer() {
    if (!canvas) return;

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
            // Smoothly key out pure black studio background (#000000)
            float maxVal = max(color.r, max(color.g, color.b));
            float alpha = smoothstep(0.012, 0.055, maxVal);
            // Render portrait in full, natural, vibrant color
            gl_FragColor = vec4(color.rgb * alpha, alpha);
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

            // Quad buffer
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

            // Tex coord buffer (flip Y for WebGL)
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

    if (!isWebGL && canvas) {
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
    if (!canvas) return;
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

    // Center-right positioning and scale matching the reference design
    const isMobile = window.innerWidth <= 768;
    const scale = isMobile
      ? Math.max(canvasHeight * 0.85 / imgHeight, canvasWidth * 0.95 / imgWidth)
      : Math.max(canvasHeight * 1.05 / imgHeight, canvasWidth * 0.72 / imgWidth);

    const renderWidth = Math.round(imgWidth * scale);
    const renderHeight = Math.round(imgHeight * scale);

    const targetCenterX = isMobile ? canvasWidth * 0.5 : canvasWidth * 0.538;
    const offsetX = Math.round(targetCenterX - (renderWidth * 0.5));
    const offsetY = Math.round(canvasHeight - renderHeight + (canvasHeight * 0.03));

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
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    const maxScroll = Math.max(1, docHeight - window.innerHeight);
    const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));
    targetFrame = scrollFraction * (FRAME_COUNT - 1);

    // Subtle fade of the background watermark title as user leaves hero
    if (heroBgLayer) {
      const fadeThreshold = window.innerHeight * 0.6;
      const heroOpacity = Math.max(0, Math.min(0.18, 0.18 * (1 - (scrollTop / fadeThreshold))));
      heroBgLayer.style.opacity = heroOpacity.toFixed(3);
    }
  }

  function animate() {
    updateTargetFrame();

    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * 0.1;
      renderFrame(Math.round(currentFrame));
    } else if (currentFrame !== targetFrame) {
      currentFrame = targetFrame;
      renderFrame(Math.round(currentFrame));
    }

    requestAnimationFrame(animate);
  }

  function hidePreloader() {
    if (preloaderHidden) return;
    preloaderHidden = true;
    if (preloader) {
      preloader.classList.add('loaded');
    }
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

        if (loadedCount >= 10 && !preloaderHidden) {
          hidePreloader();
        }

        if (loadedCount === FRAME_COUNT && !preloaderHidden) {
          hidePreloader();
        }
      };

      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= 10 && !preloaderHidden) {
          hidePreloader();
        }
      };
    }
  }

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
     6. INITIALIZATION & GLOBAL EVENT LISTENERS
     ========================================================================== */
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });

  setupRenderer();
  resizeCanvas();
  preloadImages();
  animate();
  handleScroll();

  // Safety preloader dismiss
  setTimeout(hidePreloader, 3500);

  /* ==========================================================================
     7. ABOUT PAGE — HR / MARKETING TAB SWITCHER
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
