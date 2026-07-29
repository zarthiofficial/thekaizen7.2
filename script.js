(function () {
  'use strict';

  var CONFIG = window.KAIZEN_CONFIG;

  /* -----------------------------------------------------------------
   * 1. UTM capture — runs immediately on page load, before any
   *    interaction, so values survive even if the URL changes later
   *    (e.g. after client-side navigation) or the visitor lingers
   *    before submitting.
   * --------------------------------------------------------------- */
  var UTM_STORAGE_KEY = 'kaizen_utm_v1';
  var LANDING_STORAGE_KEY = 'kaizen_landing_v1';
  var REFERRER_STORAGE_KEY = 'kaizen_referrer_v1';

  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var incoming = {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      content: params.get('utm_content'),
    };

    var hasAnyUtm = incoming.source || incoming.medium || incoming.campaign || incoming.content;

    // Only overwrite what's already stored if this visit actually carries
    // UTM params — so a later direct visit (e.g. a bookmark) doesn't wipe
    // out attribution captured on first arrival within the same session.
    if (hasAnyUtm) {
      var utm = {
        source: incoming.source || 'direct',
        medium: incoming.medium || 'direct',
        campaign: incoming.campaign || 'direct',
        content: incoming.content || 'direct',
      };
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    } else if (!sessionStorage.getItem(UTM_STORAGE_KEY)) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({
        source: 'direct', medium: 'direct', campaign: 'direct', content: 'direct'
      }));
    }

    if (!sessionStorage.getItem(LANDING_STORAGE_KEY)) {
      sessionStorage.setItem(LANDING_STORAGE_KEY, window.location.href);
    }
    if (!sessionStorage.getItem(REFERRER_STORAGE_KEY)) {
      sessionStorage.setItem(REFERRER_STORAGE_KEY, document.referrer || 'direct');
    }
  }

  function getAttribution() {
    var utm = JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) || '{}');
    return {
      utm: utm,
      landingPage: sessionStorage.getItem(LANDING_STORAGE_KEY) || window.location.href,
      referrer: sessionStorage.getItem(REFERRER_STORAGE_KEY) || 'direct',
    };
  }

  captureAttribution();

  /* -----------------------------------------------------------------
   * 2. Countdown timer
   * --------------------------------------------------------------- */
  function startCountdown() {
    var target = new Date(CONFIG.dateISO).getTime();
    var els = {
      d: document.getElementById('cd-days'),
      h: document.getElementById('cd-hours'),
      m: document.getElementById('cd-mins'),
      s: document.getElementById('cd-secs'),
    };
    if (!els.d) return;

    function tick() {
      var now = Date.now();
      var diff = target - now;
      if (diff <= 0) {
        els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = '00';
        return;
      }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      els.d.textContent = String(d).padStart(2, '0');
      els.h.textContent = String(h).padStart(2, '0');
      els.m.textContent = String(m).padStart(2, '0');
      els.s.textContent = String(s).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);
  }

  /* -----------------------------------------------------------------
   * 3. Sticky nav glass effect + smooth scroll + mobile menu
   * --------------------------------------------------------------- */
  function setupNav() {
    var nav = document.getElementById('site-nav');
    if (nav) {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('nav--scrolled', window.scrollY > 40);
      });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.getElementById('mobile-menu').classList.remove('is-open');
        }
      });
    });

    var toggle = document.getElementById('nav-toggle');
    var mobileMenu = document.getElementById('mobile-menu');
    if (toggle && mobileMenu) {
      toggle.addEventListener('click', function () {
        mobileMenu.classList.toggle('is-open');
      });
    }
  }

  /* -----------------------------------------------------------------
   * 4. FAQ accordion
   * --------------------------------------------------------------- */
  function setupFaq() {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var question = item.querySelector('.faq-item__question');
      question.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        document.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('is-open'); });
        if (!isOpen) item.classList.add('is-open');
      });
    });
  }

  /* -----------------------------------------------------------------
   * 5. Registration form
   * --------------------------------------------------------------- */
  function setupForm() {
    var form = document.getElementById('registration-form');
    if (!form) return;

    var submitBtn = document.getElementById('submit-btn');
    var submitBtnLabel = submitBtn.querySelector('.btn__label');
    var formWrap = document.getElementById('form-wrap');
    var successWrap = document.getElementById('form-success');
    var errorBanner = document.getElementById('form-error');
    var isSubmitting = false;

    // Draft persistence: preserve entered data if a submission fails
    // or the page is accidentally reloaded.
    var DRAFT_KEY = 'kaizen_form_draft_v1';

    function saveDraft() {
      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }

    function restoreDraft() {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        Object.keys(data).forEach(function (key) {
          var field = form.elements.namedItem(key);
          if (!field) return;
          if (field instanceof RadioNodeList) {
            Array.prototype.forEach.call(field, function (radio) {
              radio.checked = radio.value === data[key];
            });
          } else {
            field.value = data[key];
          }
        });
      } catch (e) { /* ignore corrupt draft */ }
    }

    restoreDraft();
    form.addEventListener('input', saveDraft);

    function clearFieldErrors() {
      form.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
      form.querySelectorAll('.form-field--invalid').forEach(function (el) {
        el.classList.remove('form-field--invalid');
      });
    }

    function showFieldError(name, message) {
      var field = form.querySelector('[name="' + name + '"]');
      var wrap = field ? field.closest('.form-field') : null;
      if (wrap) {
        wrap.classList.add('form-field--invalid');
        var errorEl = wrap.querySelector('.field-error');
        if (errorEl) errorEl.textContent = message;
      }
    }

    function validate(data) {
      var errors = {};
      if (!data.fullName || !data.fullName.trim()) errors.fullName = 'Please enter your full name.';
      if (!data.employeeCode || !data.employeeCode.trim()) errors.employeeCode = 'Employee code is required.';
      if (!data.hive || !data.hive.trim()) errors.hive = 'Please select your Hive.';

      var email = (data.officialEmail || '').trim();
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        errors.officialEmail = 'Work email is required.';
      } else if (!emailPattern.test(email)) {
        errors.officialEmail = 'Enter a valid email address.';
      }

      if (!data.zplConsent) errors.zplConsent = 'Please confirm the ZPL Points ticket deduction.';

      return errors;
    }

    function setLoading(loading) {
      isSubmitting = loading;
      submitBtn.disabled = loading;
      submitBtn.classList.toggle('is-loading', loading);
      submitBtnLabel.textContent = loading ? 'Submitting…' : 'Register for Kaizen 7.2';
    }

    function showBanner(message, tone) {
      errorBanner.textContent = message;
      errorBanner.className = 'form-banner form-banner--' + tone;
      errorBanner.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return; // hard stop on double-click / double submit

      clearFieldErrors();
      errorBanner.hidden = true;

      var formData = new FormData(form);
      var data = {};
      formData.forEach(function (value, key) { data[key] = value; });
      data.zplConsent = form.querySelector('[name="zplConsent"]').checked;

      var errors = validate(data);
      if (Object.keys(errors).length > 0) {
        Object.keys(errors).forEach(function (name) { showFieldError(name, errors[name]); });
        showBanner('Please fix the highlighted fields and try again.', 'error');
        return;
      }

      var attribution = getAttribution();
      var payload = {
        fullName: data.fullName.trim(),
        employeeCode: data.employeeCode.trim(),
        hive: data.hive,
        officialEmail: data.officialEmail.trim(),
        alcoholPreference: data.alcoholPreference || '',
        trainAssistance: data.trainAssistance || '',
        stayAssistance: data.stayAssistance || '',
        travelPreference: data.travelPreference || '',
        suggestions: data.suggestions || '',
        zplConsent: data.zplConsent ? 'Yes' : '',
        utm: attribution.utm,
        landingPage: attribution.landingPage,
        referrer: attribution.referrer,
      };

      if (!CONFIG.submissionEndpoint || CONFIG.submissionEndpoint.indexOf('PASTE_YOUR') === 0) {
        showBanner('Registration endpoint is not configured yet. Add the Apps Script Web App URL in config.js.', 'error');
        return;
      }

      setLoading(true);

      // text/plain avoids a CORS preflight (OPTIONS) request, which
      // Apps Script Web Apps do not handle — keeping this a "simple
      // request" is what makes cross-origin GitHub Pages → Apps Script
      // submissions work reliably.
      fetch(CONFIG.submissionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          setLoading(false);

          if (result.status === 'success') {
            sessionStorage.removeItem(DRAFT_KEY);
            formWrap.hidden = true;
            successWrap.hidden = false;
            successWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (result.status === 'duplicate') {
            showBanner(result.message || 'This email is already registered.', 'info');
          } else {
            showBanner(result.message || 'Something went wrong. Please try again.', 'error');
          }
        })
        .catch(function () {
          setLoading(false);
          showBanner('Network error — your details were kept, please try again.', 'error');
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    startCountdown();
    setupNav();
    setupFaq();
    setupForm();

    document.querySelectorAll('[data-track]').forEach(function (el) {
      el.addEventListener('click', function () {
        // Placeholder hook for GA4/GTM — push to dataLayer if present.
        if (window.dataLayer) {
          window.dataLayer.push({ event: 'kaizen_interaction', action: el.getAttribute('data-track') });
        }
      });
    });
  });
})();
