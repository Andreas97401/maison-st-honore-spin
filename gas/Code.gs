// ── CONFIGURATION ─────────────────────────────────────────────────
var SHEET_ID   = '1POODoEAiqzsKjEAHEwc3iF-B1EhTkN6YImze8PEdvV8';
var SHEET_NAME = 'Spin to Win';
var FROM_NAME  = 'Maison St Honoré';
var CAFE_ADDRESS = '13 Bramall St, Perth WA 6004';
var CAFE_PHONE   = '0478 744 750';
var CAFE_EMAIL   = 'hello@maisonsainthonore.com';
var CAFE_HOURS   = 'Mon–Fri 06:30–15:00 · Sat–Sun 07:00–15:00';

// ── OUTPUT HELPER ─────────────────────────────────────────────────
function corsOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET HANDLER (check action) ────────────────────────────────────
function doGet(e) {
  if (e.parameter.action === 'check') {
    return handleCheck(e.parameter.email);
  }
  return corsOutput({ ok: false, error: 'Unknown action' });
}

// ── POST HANDLER (save action) ────────────────────────────────────
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (data.action === 'save') {
    return handleSave(data);
  }
  return corsOutput({ ok: false, error: 'Unknown action' });
}

// ── CHECK EMAIL ───────────────────────────────────────────────────
function handleCheck(email) {
  if (!email) return corsOutput({ ok: false, error: 'No email provided' });

  var sheet  = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return corsOutput({ ok: true }); // empty sheet

  var emails = sheet.getRange(2, 4, lastRow - 1, 1).getValues().flat();
  var isDuplicate = emails.some(function(e) {
    return typeof e === 'string' && e.toLowerCase() === email.toLowerCase();
  });

  return corsOutput(isDuplicate ? { ok: false, reason: 'duplicate' } : { ok: true });
}

// ── SAVE ENTRY ────────────────────────────────────────────────────
function handleSave(data) {
  var sheet   = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();

  // Race condition guard — check again before writing
  if (lastRow >= 2) {
    var emails = sheet.getRange(2, 4, lastRow - 1, 1).getValues().flat();
    var duplicate = emails.some(function(e) {
      return typeof e === 'string' && e.toLowerCase() === data.email.toLowerCase();
    });
    if (duplicate) return corsOutput({ ok: false, reason: 'duplicate' });
  }

  // Append row: First Name | Last Name | Phone | Email | Date | Prize
  sheet.appendRow([
    data.firstName,
    data.lastName,
    data.phone,
    data.email,
    data.timestamp,
    data.prize
  ]);

  // Send confirmation email (all prizes including Nothing)
  sendConfirmationEmail(data);

  return corsOutput({ ok: true });
}

// ── EMAIL DISPATCH ────────────────────────────────────────────────
function sendConfirmationEmail(data) {
  var isNothing = data.prize === 'Nothing';
  var subject   = isNothing
    ? 'Thank you for playing at Maison St Honoré'
    : 'Your prize at Maison St Honoré 🎉';
  var html      = isNothing ? buildNothingEmail(data) : buildPrizeEmail(data);

  // Fetch logo as blob for inline embedding (cid:logo) — works in all email clients
  var logoBlob = UrlFetchApp
    .fetch('https://andreas97401.github.io/maison-st-honore-spin/logo.png')
    .getBlob()
    .setName('logo');

  MailApp.sendEmail({
    to:           data.email,
    subject:      subject,
    htmlBody:     html,
    name:         FROM_NAME,
    inlineImages: { logo: logoBlob },
  });
}

// ── PRIZE EMAIL TEMPLATE ──────────────────────────────────────────
function buildPrizeEmail(data) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#F5F0EB;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FEFAF4;border:2px solid #C8A96E;">' +

    // Header
    '<tr><td style="background:#1C2436;padding:32px 24px;text-align:center;">' +
    '<img src="cid:logo" width="100" height="100" alt="Maison St Honoré" style="display:block;margin:0 auto 12px;" />' +
    '<p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:13px;color:#C8A96E;letter-spacing:0.15em;">PATISSERIE FRANÇAISE</p>' +
    '</td></tr>' +

    // Greeting
    '<tr><td style="padding:40px 40px 16px;text-align:center;">' +
    '<h1 style="margin:0;font-family:Georgia,\'Times New Roman\',serif;font-size:28px;font-weight:600;color:#2C2415;line-height:1.2;">Congratulations, ' + data.firstName + '!</h1>' +
    '</td></tr>' +

    // Prize block
    '<tr><td style="padding:8px 40px 24px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0E6D0;border:1.5px solid #C8A96E;">' +
    '<tr><td style="padding:28px;text-align:center;">' +
    '<p style="margin:0 0 6px;font-family:Georgia,serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#8A6A2A;">Your prize</p>' +
    '<p style="margin:0;font-family:Georgia,\'Times New Roman\',serif;font-size:26px;font-weight:600;color:#2C2415;">' + data.prize + '</p>' +
    '</td></tr></table>' +
    '</td></tr>' +

    // Instruction
    '<tr><td style="padding:16px 40px;text-align:center;">' +
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:15px;color:#2C2415;line-height:1.6;">Simply <strong>show this email</strong> to our team at the counter to claim your prize.</p>' +
    '</td></tr>' +

    // Divider
    '<tr><td style="padding:8px 40px;"><hr style="border:none;border-top:1px solid #C8A96E;" /></td></tr>' +

    // Café info
    '<tr><td style="padding:16px 40px 32px;text-align:center;">' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7A6A58;">' + CAFE_ADDRESS + '</p>' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7A6A58;">' + CAFE_PHONE + '</p>' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7A6A58;">' + CAFE_HOURS + '</p>' +
    '<p style="margin:8px 0 0;"><a href="mailto:' + CAFE_EMAIL + '" style="font-family:Arial,sans-serif;font-size:12px;color:#C8A96E;text-decoration:none;">' + CAFE_EMAIL + '</a></p>' +
    '</td></tr>' +

    // Footer
    '<tr><td style="background:#1C2436;padding:20px;text-align:center;">' +
    '<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#7A8BA0;letter-spacing:0.08em;">Maison St Honoré · EST. 2010 · Patisserie Française</p>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

// ── NOTHING EMAIL TEMPLATE ────────────────────────────────────────
function buildNothingEmail(data) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#F5F0EB;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FEFAF4;border:2px solid #C8A96E;">' +

    // Header
    '<tr><td style="background:#1C2436;padding:32px 24px;text-align:center;">' +
    '<img src="cid:logo" width="100" height="100" alt="Maison St Honoré" style="display:block;margin:0 auto 12px;" />' +
    '<p style="margin:0;font-family:Georgia,serif;font-style:italic;font-size:13px;color:#C8A96E;letter-spacing:0.15em;">PATISSERIE FRANÇAISE</p>' +
    '</td></tr>' +

    // Greeting
    '<tr><td style="padding:40px 40px 16px;text-align:center;">' +
    '<h1 style="margin:0;font-family:Georgia,\'Times New Roman\',serif;font-size:28px;font-weight:400;font-style:italic;color:#2C2415;line-height:1.2;">Thank you for playing, ' + data.firstName + '!</h1>' +
    '</td></tr>' +

    // Message
    '<tr><td style="padding:8px 40px 24px;text-align:center;">' +
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:15px;color:#2C2415;line-height:1.7;">Better luck next time! If you haven\'t picked up your <strong>loyalty card</strong> yet, just ask our team at the counter — it\'s free and gets you closer to your next reward.</p>' +
    '</td></tr>' +

    // Divider
    '<tr><td style="padding:8px 40px;"><hr style="border:none;border-top:1px solid #C8A96E;" /></td></tr>' +

    // Café info
    '<tr><td style="padding:16px 40px 32px;text-align:center;">' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7A6A58;">' + CAFE_ADDRESS + '</p>' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7A6A58;">' + CAFE_PHONE + '</p>' +
    '<p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#7A6A58;">' + CAFE_HOURS + '</p>' +
    '<p style="margin:8px 0 0;"><a href="mailto:' + CAFE_EMAIL + '" style="font-family:Arial,sans-serif;font-size:12px;color:#C8A96E;text-decoration:none;">' + CAFE_EMAIL + '</a></p>' +
    '</td></tr>' +

    // Footer
    '<tr><td style="background:#1C2436;padding:20px;text-align:center;">' +
    '<p style="margin:0;font-family:Georgia,serif;font-size:12px;color:#7A8BA0;letter-spacing:0.08em;">Maison St Honoré · EST. 2010 · Patisserie Française</p>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}
