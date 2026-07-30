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

    var DRAFT_KEY = 'kaizen_form_draft_v1';

    function saveDraft() {
      var data = {};
      new
