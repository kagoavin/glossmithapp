/**
 * GLOSSMITH SALES CRM — Google Apps Script backend (v2 rebuild)
 * =============================================================
 * Vehicle-first data model. One source of truth. Atomic close.
 *
 * SETUP (do this once, in the Apps Script bound to THIS sheet via
 * Extensions > Apps Script):
 *   1. Paste this whole file over Code.gs. Save.
 *   2. Run "setup"        (dropdown at top > setup > Run, approve access)
 *   3. Run "repairAllSheets"  (fixes any old column drift, keeps data)
 *   4. Deploy > New deployment > Web app > Execute as: Me >
 *      Who has access: Anyone > Deploy. Copy the URL.
 *   5. Put that URL in index.html WEB_APP_URL if it changed.
 *
 * Every read/write is by COLUMN NAME, never position — safe to add
 * fields later without breaking old rows.
 */

const SCRIPT_VERSION = "v6-2026-07-02-final";

const SHEET_SALES = "Sales";
const SHEET_PROMOS = "Promos";
const SHEET_PROMO_EVENTS = "PromoEvents";
const SHEET_MEMBERS = "Members";
const SHEET_JOBDATA = "JobData";
const SHEET_MPESA = "MpesaLog";
const SHEET_STAFF = "Staff";
const DRIVE_FOLDER_NAME = "Glossmith Job Photos";

// Sales is the single source of truth. Vehicles are derived from it client-side.
const SALES_HEADERS = [
  "id","timestamp","plate","model","clientName","phone","vehicleClass",
  "channel","service","amount","promoCode","discount","finalAmount",
  "deposit","paymentMethod","mpesaCode","cashConfirmed","stage","loggedBy"
];
const PROMOS_HEADERS = ["id","code","owner","category","rate","createdAt"];
const PROMO_EVENTS_HEADERS = ["id","timestamp","code","source","note"];
// Staff: individual staff members with their own commission rate.
const STAFF_HEADERS = ["id","name","rate","createdAt"];
// Members: type = "inhouse" | "partner". paymentMethod = "M-Pesa" | "Cash".
const MEMBERS_HEADERS = [
  "id","type","plate","name","phone","paymentMethod","mpesaRef","joinedAt","notes"
];
// JobData: one row per sale id. Photos are Drive URLs (JSON arrays).
// Checklists are JSON. camePresent = "what came in the car",
// workDone = "what's done on the car".
const JOBDATA_HEADERS = [
  "id","saleId","plate","intakePhotos","handoverPhotos",
  "camePresent","workDone","intakeNote","handoverNote","updatedAt"
];
// MpesaLog: every STK push + callback, for auditing and reconciliation.
const MPESA_HEADERS = [
  "id","saleId","checkoutId","merchantRequestId","phone","amount",
  "status","mpesaReceipt","resultDesc","createdAt","completedAt"
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_SALES, SALES_HEADERS);
  ensureSheet_(ss, SHEET_PROMOS, PROMOS_HEADERS);
  ensureSheet_(ss, SHEET_PROMO_EVENTS, PROMO_EVENTS_HEADERS);
  ensureSheet_(ss, SHEET_MEMBERS, MEMBERS_HEADERS);
  ensureSheet_(ss, SHEET_JOBDATA, JOBDATA_HEADERS);
  ensureSheet_(ss, SHEET_MPESA, MPESA_HEADERS);
  ensureSheet_(ss, SHEET_STAFF, STAFF_HEADERS);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("STAFF_PIN")) props.setProperty("STAFF_PIN", "1234");
  if (!props.getProperty("OWNER_PIN")) props.setProperty("OWNER_PIN", "9999");
  // Daraja placeholders — fill these in via setDarajaCredentials() when ready.
  ["MPESA_ENV","MPESA_CONSUMER_KEY","MPESA_CONSUMER_SECRET","MPESA_SHORTCODE","MPESA_PASSKEY"].forEach(function(k){
    if (props.getProperty(k) === null) props.setProperty(k, "");
  });
}

function setPins() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("STAFF_PIN", "1234");   // <-- staff PIN
  props.setProperty("OWNER_PIN", "9999");   // <-- owner PIN
}

// ============================================================
// DARAJA (M-PESA) SETUP — run this once when your credentials arrive.
// Get these from developer.safaricom.co.ke (your app) and your
// registered Paybill/Till. Then edit the values below and Run this
// function. Nothing is hard-coded in the file — it's stored securely
// in Script Properties.
// ============================================================
function setDarajaCredentials() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("MPESA_ENV", "sandbox");        // "sandbox" or "production"
  props.setProperty("MPESA_CONSUMER_KEY", "");      // <-- from Daraja app
  props.setProperty("MPESA_CONSUMER_SECRET", "");   // <-- from Daraja app
  props.setProperty("MPESA_SHORTCODE", "");         // <-- your Paybill/Till number
  props.setProperty("MPESA_PASSKEY", "");           // <-- Lipa Na M-Pesa passkey
  Logger.log("Daraja credentials saved. Env: " + props.getProperty("MPESA_ENV"));
}

function darajaConfigured_() {
  const props = PropertiesService.getScriptProperties();
  return !!(props.getProperty("MPESA_CONSUMER_KEY") && props.getProperty("MPESA_CONSUMER_SECRET") &&
            props.getProperty("MPESA_SHORTCODE") && props.getProperty("MPESA_PASSKEY"));
}

function checkPin_(pin) {
  const props = PropertiesService.getScriptProperties();
  if (String(pin) === String(props.getProperty("OWNER_PIN"))) return { role: "owner" };
  if (String(pin) === String(props.getProperty("STAFF_PIN"))) return { role: "staff" };
  return { role: null };
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    return;
  }
  const lastCol = sheet.getLastColumn();
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const missing = headers.filter(h => existing.indexOf(h) === -1);
  if (missing.length) sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
}

function headerMap_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function normalizePlate_(p) {
  return String(p || "").toUpperCase().replace(/\s+/g, "");
}

// ---------- routing ----------

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return jsonOut_({
    version: SCRIPT_VERSION,
    sales: readSheet_(ss, SHEET_SALES),
    promos: readSheet_(ss, SHEET_PROMOS),
    promoEvents: readSheet_(ss, SHEET_PROMO_EVENTS),
    members: readSheet_(ss, SHEET_MEMBERS),
    jobData: readSheet_(ss, SHEET_JOBDATA),
    staff: readSheet_(ss, SHEET_STAFF),
  });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut_({ ok: false, error: "Bad request body" }); }

  // Safaricom Daraja callbacks arrive as raw {Body:{stkCallback:{...}}} —
  // not our {action, payload} shape. Detect and route them here.
  if (body && body.Body && body.Body.stkCallback) {
    return jsonOut_(handleMpesaCallback_(ss, body));
  }

  const action = body.action;
  const p = body.payload || {};
  try {
    switch (action) {
      case "addSale":      return jsonOut_(addSale_(ss, p));
      case "setStage":     return jsonOut_(setStage_(ss, p.id, p.stage, p.clearBalance));
      case "clearBalance": return jsonOut_(setStage_(ss, p.id, null, true));
      case "paidInFull":   return jsonOut_(setStage_(ss, p.id, null, true));
      case "deleteSale":   return jsonOut_(deleteRow_(ss, SHEET_SALES, p.id));
      case "addPromo":     return jsonOut_(addPromo_(ss, p));
      case "deletePromo":  return jsonOut_(deleteRow_(ss, SHEET_PROMOS, p.id));
      case "addMember":    return jsonOut_(addMember_(ss, p));
      case "deleteMember": return jsonOut_(deleteRow_(ss, SHEET_MEMBERS, p.id));
      case "addStaff":     return jsonOut_(addRow_(ss, SHEET_STAFF, p));
      case "updateStaff":  return jsonOut_(updateStaff_(ss, p));
      case "deleteStaff":  return jsonOut_(deleteRow_(ss, SHEET_STAFF, p.id));
      case "uploadPhoto":  return jsonOut_(uploadPhoto_(p));
      case "saveJobData":  return jsonOut_(saveJobData_(ss, p));
      case "stkPush":      return jsonOut_(stkPush_(ss, p));
      case "stkStatus":    return jsonOut_(stkStatus_(ss, p.saleId));
      case "mpesaCallback":return jsonOut_(handleMpesaCallback_(ss, body));
      case "validatePromo":return jsonOut_(validatePromo_(ss, p.code, p.source || "app"));
      case "checkPin":     return jsonOut_(checkPin_(p.pin));
      default:             return jsonOut_({ ok: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

// ---------- generic helpers (by column NAME) ----------

function readSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = headerMap_(sheet);
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
    return obj;
  }).filter(o => o.id);
}

function addRow_(ss, name, payload) {
  const sheet = ss.getSheetByName(name);
  const headers = headerMap_(sheet);
  const id = Utilities.getUuid().slice(0, 8);
  const row = headers.map(h => {
    if (!h) return "";
    if (h === "id") return id;
    if (h === "timestamp" || h === "createdAt" || h === "joinedAt")
      return payload[h] || new Date().toISOString();
    return payload[h] !== undefined ? payload[h] : "";
  });
  sheet.appendRow(row);
  return { id, ok: true };
}

function findRowIndex_(sheet, id) {
  const headers = headerMap_(sheet);
  const idCol = headers.indexOf("id") + 1;
  if (idCol === 0) return -1;
  const ids = sheet.getRange(2, idCol, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat();
  return ids.indexOf(id);
}

function setCell_(sheet, rowIdx0, headerName, value) {
  const headers = headerMap_(sheet);
  const col = headers.indexOf(headerName) + 1;
  if (col === 0) return false;
  sheet.getRange(rowIdx0 + 2, col).setValue(value);
  return true;
}

function getCell_(sheet, rowIdx0, headerName) {
  const headers = headerMap_(sheet);
  const col = headers.indexOf(headerName) + 1;
  if (col === 0) return undefined;
  return sheet.getRange(rowIdx0 + 2, col).getValue();
}

function deleteRow_(ss, name, id) {
  const sheet = ss.getSheetByName(name);
  const idx = findRowIndex_(sheet, id);
  if (idx === -1) return { ok: false, error: "not found" };
  sheet.deleteRow(idx + 2);
  return { ok: true };
}

// ---------- sales ----------

function addSale_(ss, payload) {
  payload.plate = normalizePlate_(payload.plate);
  return addRow_(ss, SHEET_SALES, payload);
}

// The ONE action for pipeline transitions AND balance clearing.
//  - stage: the new stage (or null to leave stage unchanged)
//  - clearBalance: if true, set deposit = finalAmount (balance -> 0)
// Closing (stage="Closed") always clears the balance too.
function setStage_(ss, id, stage, clearBalance) {
  const sheet = ss.getSheetByName(SHEET_SALES);
  const idx = findRowIndex_(sheet, id);
  if (idx === -1) return { ok: false, error: "row not found: " + id };
  if (stage) setCell_(sheet, idx, "stage", stage);
  if (clearBalance || stage === "Closed") {
    const finalAmount = getCell_(sheet, idx, "finalAmount");
    setCell_(sheet, idx, "deposit", finalAmount); // balance -> 0, deposit now reflects full amount incl. any earlier deposit
  }
  return { ok: true, stage: stage || undefined, cleared: !!(clearBalance || stage === "Closed") };
}

// ---------- promos ----------

function addPromo_(ss, payload) {
  const existing = readSheet_(ss, SHEET_PROMOS);
  const code = String(payload.code || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Code is required" };
  const clash = existing.find(p => String(p.code).trim().toUpperCase() === code);
  if (clash) return { ok: false, error: "That code already exists (" + clash.owner + ")" };
  payload.code = code;
  if (payload.rate === undefined || payload.rate === "") payload.rate = 0.10;
  return addRow_(ss, SHEET_PROMOS, payload);
}

function updateStaff_(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_STAFF);
  const idx = findRowIndex_(sheet, payload.id);
  if (idx === -1) return { ok: false, error: "staff not found" };
  if (payload.name !== undefined) setCell_(sheet, idx, "name", payload.name);
  if (payload.rate !== undefined) setCell_(sheet, idx, "rate", payload.rate);
  return { ok: true };
}

function validatePromo_(ss, code, source) {
  if (!code) return { valid: false };
  const promos = readSheet_(ss, SHEET_PROMOS);
  const match = promos.find(p => String(p.code).toUpperCase() === String(code).toUpperCase());
  ss.getSheetByName(SHEET_PROMO_EVENTS).appendRow([
    Utilities.getUuid().slice(0, 8), new Date().toISOString(),
    String(code).toUpperCase(), source, match ? "matched:" + match.owner : "no match",
  ]);
  if (!match) return { valid: false };
  return { valid: true, code: match.code, owner: match.owner, category: match.category, discountRate: 0.08 };
}

// ---------- members ----------

function addMember_(ss, payload) {
  payload.plate = normalizePlate_(payload.plate);
  if (!payload.type) payload.type = "inhouse";
  return addRow_(ss, SHEET_MEMBERS, payload);
}

// ---------- repair ----------

function repairAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const res = {
    Sales: repairSheet_(ss, SHEET_SALES, SALES_HEADERS),
    Promos: repairSheet_(ss, SHEET_PROMOS, PROMOS_HEADERS),
    PromoEvents: repairSheet_(ss, SHEET_PROMO_EVENTS, PROMO_EVENTS_HEADERS),
    Members: repairSheet_(ss, SHEET_MEMBERS, MEMBERS_HEADERS),
    JobData: repairSheet_(ss, SHEET_JOBDATA, JOBDATA_HEADERS),
    MpesaLog: repairSheet_(ss, SHEET_MPESA, MPESA_HEADERS),
    Staff: repairSheet_(ss, SHEET_STAFF, STAFF_HEADERS),
  };
  Logger.log(JSON.stringify(res, null, 2));
  return res;
}

function repairSheet_(ss, name, canonicalHeaders) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) { ensureSheet_(ss, name, canonicalHeaders); return { ok: true, created: true }; }
  const rows = readSheet_(ss, name);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);
  sheet.setFrozenRows(1);
  if (rows.length) {
    const values = rows.map(r => canonicalHeaders.map(h => r[h] !== undefined ? r[h] : ""));
    sheet.getRange(2, 1, values.length, canonicalHeaders.length).setValues(values);
  }
  return { ok: true, rowsRestored: rows.length };
}

// ---------- photos (Google Drive) ----------

function getDriveFolder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

// Accepts a base64 data URL, saves it to Drive, returns a viewable link.
function uploadPhoto_(p) {
  if (!p.dataUrl) return { ok: false, error: "no image data" };
  const m = String(p.dataUrl).match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return { ok: false, error: "bad image format" };
  const contentType = m[1], b64 = m[2];
  const bytes = Utilities.base64Decode(b64);
  const plate = normalizePlate_(p.plate || "job");
  const kind = p.kind || "photo";
  const name = plate + "_" + kind + "_" + new Date().getTime() + "." + (contentType.split("/")[1] || "jpg");
  const blob = Utilities.newBlob(bytes, contentType, name);
  const file = getDriveFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id = file.getId();
  return { ok: true, url: "https://drive.google.com/uc?export=view&id=" + id, fileId: id };
}

// ---------- job data (photos + checklists per sale) ----------

function saveJobData_(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_JOBDATA);
  const saleId = payload.saleId;
  if (!saleId) return { ok: false, error: "saleId required" };
  const all = readSheet_(ss, SHEET_JOBDATA);
  const existing = all.find(r => r.saleId === saleId);
  const fields = ["intakePhotos","handoverPhotos","camePresent","workDone","intakeNote","handoverNote"];
  if (!existing) {
    const row = { saleId: saleId, plate: normalizePlate_(payload.plate), updatedAt: new Date().toISOString() };
    fields.forEach(f => { if (payload[f] !== undefined) row[f] = payload[f]; });
    return addRow_(ss, SHEET_JOBDATA, row);
  }
  const idx = findRowIndex_(sheet, existing.id);
  fields.forEach(f => { if (payload[f] !== undefined) setCell_(sheet, idx, f, payload[f]); });
  setCell_(sheet, idx, "updatedAt", new Date().toISOString());
  return { ok: true, id: existing.id };
}

// ============================================================
// DARAJA (M-PESA STK PUSH) MODULE
// ============================================================

function darajaBase_() {
  const env = PropertiesService.getScriptProperties().getProperty("MPESA_ENV") || "sandbox";
  return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

function darajaToken_() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty("MPESA_CONSUMER_KEY");
  const secret = props.getProperty("MPESA_CONSUMER_SECRET");
  const auth = Utilities.base64Encode(key + ":" + secret);
  const res = UrlFetchApp.fetch(darajaBase_() + "/oauth/v1/generate?grant_type=client_credentials", {
    headers: { Authorization: "Basic " + auth }, muteHttpExceptions: true,
  });
  const data = JSON.parse(res.getContentText());
  if (!data.access_token) throw new Error("Daraja auth failed: " + res.getContentText());
  return data.access_token;
}

function darajaTimestamp_() {
  return Utilities.formatDate(new Date(), "Africa/Nairobi", "yyyyMMddHHmmss");
}

// Normalise 07XX / 01XX / +2547XX to 2547XX format Daraja expects.
function darajaPhone_(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.indexOf("0") === 0) d = "254" + d.slice(1);
  if (d.indexOf("254") !== 0 && d.length === 9) d = "254" + d;
  return d;
}

function stkPush_(ss, p) {
  if (!darajaConfigured_()) {
    return { ok: false, error: "M-Pesa not set up yet. Run setDarajaCredentials() in Apps Script once your Paybill is ready." };
  }
  const sale = readSheet_(ss, SHEET_SALES).find(s => s.id === p.saleId);
  if (!sale) return { ok: false, error: "sale not found" };
  const amount = Math.max(1, Math.round(Number(p.amount || (Number(sale.finalAmount) - Number(sale.deposit)))));
  const phone = darajaPhone_(p.phone || sale.phone);
  if (!phone) return { ok: false, error: "no phone number on this sale" };

  const props = PropertiesService.getScriptProperties();
  const shortcode = props.getProperty("MPESA_SHORTCODE");
  const passkey = props.getProperty("MPESA_PASSKEY");
  const ts = darajaTimestamp_();
  const password = Utilities.base64Encode(shortcode + passkey + ts);
  const callbackUrl = ScriptApp.getService().getUrl(); // this web app receives the callback

  const payload = {
    BusinessShortCode: shortcode, Password: password, Timestamp: ts,
    TransactionType: "CustomerPayBillOnline", Amount: amount,
    PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
    CallBackURL: callbackUrl, AccountReference: (sale.plate || "Glossmith").slice(0, 12),
    TransactionDesc: ("Sale " + sale.id).slice(0, 13),
  };
  const res = UrlFetchApp.fetch(darajaBase_() + "/mpesa/stkpush/v1/processrequest", {
    method: "post", contentType: "application/json",
    headers: { Authorization: "Bearer " + darajaToken_() },
    payload: JSON.stringify(payload), muteHttpExceptions: true,
  });
  const data = JSON.parse(res.getContentText());
  if (data.ResponseCode !== "0") {
    return { ok: false, error: data.errorMessage || data.ResponseDescription || "STK push failed" };
  }
  addRow_(ss, SHEET_MPESA, {
    saleId: sale.id, checkoutId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID,
    phone: phone, amount: amount, status: "pending", createdAt: new Date().toISOString(),
  });
  return { ok: true, checkoutId: data.CheckoutRequestID, message: "Payment request sent to " + phone };
}

function handleMpesaCallback_(ss, body) {
  const cb = body.Body.stkCallback;
  const checkoutId = cb.CheckoutRequestID;
  const sheet = ss.getSheetByName(SHEET_MPESA);
  const rows = readSheet_(ss, SHEET_MPESA);
  const rec = rows.find(r => r.checkoutId === checkoutId);
  if (!rec) return { ResultCode: 0, ResultDesc: "Accepted (no matching record)" };
  const idx = findRowIndex_(sheet, rec.id);
  const success = String(cb.ResultCode) === "0";
  let receipt = "";
  if (success && cb.CallbackMetadata && cb.CallbackMetadata.Item) {
    const item = cb.CallbackMetadata.Item.find(i => i.Name === "MpesaReceiptNumber");
    if (item) receipt = item.Value;
  }
  setCell_(sheet, idx, "status", success ? "success" : "failed");
  setCell_(sheet, idx, "mpesaReceipt", receipt);
  setCell_(sheet, idx, "resultDesc", cb.ResultDesc || "");
  setCell_(sheet, idx, "completedAt", new Date().toISOString());

  // On success, mark the sale paid in full with the real receipt.
  if (success) {
    const salesSheet = ss.getSheetByName(SHEET_SALES);
    const sIdx = findRowIndex_(salesSheet, rec.saleId);
    if (sIdx !== -1) {
      const finalAmount = getCell_(salesSheet, sIdx, "finalAmount");
      setCell_(salesSheet, sIdx, "deposit", finalAmount);
      setCell_(salesSheet, sIdx, "paymentMethod", "M-Pesa");
      if (receipt) setCell_(salesSheet, sIdx, "mpesaCode", receipt);
    }
  }
  return { ResultCode: 0, ResultDesc: "Accepted" };
}

// Poll from the app to see if the customer has completed the prompt.
function stkStatus_(ss, saleId) {
  const rows = readSheet_(ss, SHEET_MPESA).filter(r => r.saleId === saleId);
  if (!rows.length) return { ok: true, status: "none" };
  const latest = rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  return { ok: true, status: latest.status, receipt: latest.mpesaReceipt || "", resultDesc: latest.resultDesc || "" };
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
