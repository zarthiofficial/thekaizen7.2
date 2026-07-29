/**
 * Kaizen 7.2 • Bhopal Chapter — Registration backend
 * ---------------------------------------------------------------------
 * HOW THIS IS WIRED
 * This script must be BOUND to your Google Sheet:
 *   Open the Sheet → Extensions → Apps Script → paste this file in.
 * That way the script always writes to "this" spreadsheet — you never
 * need to paste a Sheet ID or URL anywhere, including in the frontend.
 *
 * SHEET SETUP (do this once, before deploying)
 *   1. Create a spreadsheet, e.g. "Kaizen 2026 Registrations".
 *   2. Rename (or create) a tab called exactly:  Registrations
 *   3. Row 1 headers, in this exact order:
 *      Timestamp | Full Name | Employee Code | Hive | Official Email |
 *      Alcohol Preference | Train Booking Assistance | Stay Booking
 *      Assistance | Travel Preference | Event Suggestions |
 *      ZPL Ticket Consent | UTM Source | UTM Medium | UTM Campaign |
 *      UTM Content | Landing Page | Referrer
 *
 * DEPLOY AS WEB APP
 *   Deploy → New deployment → type: Web app
 *     Execute as:      Me
 *     Who has access:  Anyone
 *   Copy the resulting /exec URL into config.js on the frontend.
 * ---------------------------------------------------------------------
 */

var SHEET_NAME = 'Registrations';

// Keep this list in sync with the Sheet's header row (Timestamp is
// generated server-side and is not expected from the client).
var COLUMNS = [
  'Timestamp',
  'Full Name',
  'Employee Code',
  'Hive',
  'Official Email',
  'Alcohol Preference',
  'Train Booking Assistance',
  'Stay Booking Assistance',
  'Travel Preference',
  'Event Suggestions',
  'ZPL Ticket Consent',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'UTM Content',
  'Landing Page',
  'Referrer'
];

// Fields that MUST be present and non-empty for a submission to be valid.
var REQUIRED_FIELDS = ['fullName', 'employeeCode', 'hive', 'officialEmail', 'zplConsent'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  var result;

  try {
    // Wait up to 20s for the lock — this serialises concurrent
    // submissions so the duplicate-email check below is race-safe.
    lock.waitLock(20000);

    var payload = parseRequestBody(e);
    var validation = validatePayload(payload);

    if (!validation.valid) {
      result = { status: 'error', message: validation.message };
      return jsonResponse(result);
    }

    var sheet = getSheet();
    var email = String(payload.officialEmail).trim().toLowerCase();

    if (emailAlreadyRegistered(sheet, email)) {
      result = {
        status: 'duplicate',
        message: 'This email is already registered for Kaizen 7.2 • Bhopal Chapter.'
      };
      return jsonResponse(result);
    }

    var row = buildRow(payload);
    sheet.appendRow(row);

    result = { status: 'success', message: 'Registration confirmed.' };
    return jsonResponse(result);

  } catch (err) {
    result = { status: 'error', message: 'Server error: ' + err.message };
    return jsonResponse(result);
  } finally {
    lock.releaseLock();
  }
}

// Allows a quick health check by visiting the deployed URL directly.
function doGet(e) {
  return jsonResponse({ status: 'ok', message: 'Kaizen registration endpoint is live.' });
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Empty request body.');
  }
  return JSON.parse(e.postData.contents);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Malformed submission.' };
  }

  for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
    var field = REQUIRED_FIELDS[i];
    var value = payload[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      return { valid: false, message: 'Missing required field: ' + field };
    }
  }

  var email = String(payload.officialEmail).trim();
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, message: 'Please provide a valid work email address.' };
  }

  return { valid: true };
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function emailAlreadyRegistered(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  // "Official Email" is column 5 (A=1 ... E=5)
  var emailColumnIndex = COLUMNS.indexOf('Official Email') + 1;
  var existingEmails = sheet.getRange(2, emailColumnIndex, lastRow - 1, 1).getValues();

  for (var i = 0; i < existingEmails.length; i++) {
    var existing = String(existingEmails[i][0]).trim().toLowerCase();
    if (existing === email) return true;
  }
  return false;
}

function buildRow(payload) {
  var utm = payload.utm || {};

  return [
    new Date(),                              // Timestamp — server generated
    safe(payload.fullName),
    safe(payload.employeeCode),
    safe(payload.hive),
    safe(payload.officialEmail).trim().toLowerCase(),
    safe(payload.alcoholPreference),
    safe(payload.trainAssistance),
    safe(payload.stayAssistance),
    safe(payload.travelPreference),
    safe(payload.suggestions),
    safe(payload.zplConsent),
    safe(utm.source) || 'direct',
    safe(utm.medium) || 'direct',
    safe(utm.campaign) || 'direct',
    safe(utm.content) || 'direct',
    safe(payload.landingPage),
    safe(payload.referrer) || 'direct'
  ];
}

function safe(value) {
  return (value === undefined || value === null) ? '' : String(value).trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
