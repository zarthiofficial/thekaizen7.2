/**
 * config.js
 * -----------------------------------------------------------------------
 * Central place to update event details and the backend endpoint.
 * Nothing sensitive (no Sheet ID, no Google credentials) lives here —
 * only the public Apps Script Web App URL, which is meant to be called
 * from the browser.
 * -----------------------------------------------------------------------
 */

window.KAIZEN_CONFIG = {
  // Event details — edit freely, the page reads from here.
  eventName: "Kaizen 7.2 • Bhopal Chapter",
  tagline: "Where Culture Meets Collaboration",
  dateISO: "2026-10-09T17:00:00+05:30", // 9 Oct, 5:00 PM IST — used for the countdown
  dateDisplay: "9 October 2026",
  timeDisplay: "5:00 PM onwards — Tentative",
  city: "Bhopal",
  venueDisplay: "Venue — To Be Announced",
  ticketDisplay: "5 ZPL Points",
  contactEmail: "brandcomms@zarthi.com",

  // Paste the Web App URL you get after deploying the Apps Script
  // (Deploy → New deployment → Web app). Replace the placeholder below.
  submissionEndpoint: "https://script.google.com/macros/s/AKfycbyhW6fxdlVja3mdv21V5C3qnT-Qbu9kh-M2Vey0RpuxiEvhw4M9XFKXNpp91fRWQb1X/exec",
};
