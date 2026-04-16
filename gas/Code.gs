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

  MailApp.sendEmail({
    to:       data.email,
    subject:  subject,
    htmlBody: html,
    name:     FROM_NAME,
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
    '<img src="data:image/png;base64,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" width="120" height="120" alt="Maison St Honoré" style="display:block;margin:0 auto 12px;" />' +
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
    '<img src="data:image/png;base64,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" width="120" height="120" alt="Maison St Honoré" style="display:block;margin:0 auto 12px;" />' +
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
