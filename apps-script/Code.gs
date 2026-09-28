/**
 * Egyptian American Center - Routed Placement Test
 */

const CONFIG = Object.freeze({
  SPREADSHEET_ID: '14W8s9oDn6rsS_TxxrMxgL7qEvCbhgMGyezCF59rt7OE',
  HEADER_ROW: 2
});

const EXPECTED_HEADERS = Object.freeze([
  'Name',
  'Phone Number',
  'Level',
  'Date',
  'Comments',
  'Action'
]);

const ADULT_LANGUAGE_SHEETS = Object.freeze({
  'General English': 'G.E',
  'Conversation': 'CONVO',
  'TOEFL': 'TOEFL AND IELTS',
  'IELTS': 'TOEFL AND IELTS',
  'PTE': 1846010792,
  'OET': 1846010792,
  'Spanish': 'SPANISH',
  'German': 'GERMAN',
  'Italian': 'ITALIAN',
  'French': 'FRENCH'
});

const KIDS_CAMP_SHEETS = Object.freeze({
  'Summer Camp 1': 'Summer Camp Kids - Camp 1',
  'Summer Camp 2': 'Summer Camp Kids - Camp 2',
  'Summer Camp 3': 'Summer Camp Kids - Camp 3',
  'Winter Camp': 1125972872
});

const YOUTH_CAMP_SHEETS = Object.freeze({
  'Summer Camp 1': 'Summer Camp Youths - Camp 1',
  'Summer Camp 2': 'Summer Camp Youths - Camp 2',
  'Winter Camp': 729068088
});

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html>' +
    '<html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Placement Test Router</title></head>' +
    '<body style="font-family:Arial,sans-serif;padding:40px;color:#1a237e">' +
    '<h2>Placement Test router is active.</h2>' +
    '<p>Adults route by language. Kids and Youth route by summer/winter camp.</p>' +
    '</body></html>'
  );
}

function setupWorkbook() {
  const spreadsheet =
    SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const sheetNames = getAllDestinationSheetNames_();
  const results = [];

  sheetNames.forEach(function (sheetName) {
    const sheet = getSheetByNameSafe_(spreadsheet, sheetName);

    ensureHeaderRow_(sheet);
    const headerRow = findHeaderRow_(sheet);

    results.push(
      sheet.getName() + ': header row ' + headerRow
    );
  });

  Logger.log(results.join('\n'));
  return results.join('\n');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  let stage = 'starting submission';

  try {
    stage = 'acquiring script lock';
    lock.waitLock(30000);
    lockAcquired = true;

    stage = 'reading form fields';
    const parameters =
      e && e.parameter ? e.parameter : {};

    stage = 'validating form fields';
    const submission = validateAndNormalizeSubmission_(parameters);

    stage = 'opening spreadsheet';
    const spreadsheet =
      SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    stage = 'choosing destination sheet';
    const destinationSheetName =
      getDestinationSheetName_(
        submission.programme,
        submission.language,
        submission.camp
      );

    stage = 'opening destination sheet';
    const sheet =
      getSheetByNameSafe_(spreadsheet, destinationSheetName);

    stage = 'ensuring header row';
    ensureHeaderRow_(sheet);

    const headerRow = findHeaderRow_(sheet);

    stage = 'finding append row after last name';
    const destinationRow =
      findFirstAvailableRow_(sheet, headerRow);

    stage = 'writing Name to column A';
    sheet.getRange(destinationRow, 1)
      .setValue(safeCell_(submission.name));

    stage = 'writing Phone Number to column B';
    sheet.getRange(destinationRow, 2)
      .setValue(safeCell_(submission.mobileNumber));

    stage = 'writing Level to column C';
    sheet.getRange(destinationRow, 3)
      .clearDataValidations()
      .setValue(safeCell_(submission.level));

    stage = 'writing Date to column D';
    sheet.getRange(destinationRow, 4)
      .setNumberFormat('d/m/yyyy')
      .setValue(submission.testDate);

    stage = 'writing Comments to column E';
    sheet.getRange(destinationRow, 5)
      .setValue(safeCell_(submission.notes));

    SpreadsheetApp.flush();

    return createSuccessPage_(
      sheet.getName(),
      destinationRow,
      sheet.getSheetId()
    );

  } catch (error) {
    console.error(error);
    return createErrorPage_(error, stage);

  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

function validateAndNormalizeSubmission_(parameters) {
  const name = String(parameters.name || '').trim();
  const mobileNumber =
    String(parameters.mobileNumber || '').trim();

  const programme =
    normalizeProgramme_(parameters.programme);

  const language =
    normalizeLanguage_(parameters.language);

  const camp =
    normalizeCamp_(parameters.camp);

  const level = String(parameters.level || '').trim();
  const notes = String(parameters.notes || '').trim();
  const testDate = parseRequiredDate_(parameters.testDate);

  const missing = [];

  if (!name) missing.push('Name');
  if (!mobileNumber) missing.push('Mobile Number');
  if (!programme) missing.push('Programme');
  if (!level) missing.push('Candidate Level');
  if (!testDate) missing.push('Test Date');

  if (programme === 'Adults' && !language) {
    missing.push('Language');
  }

  if (
    (programme === 'Kids' || programme === 'Youth') &&
    !camp
  ) {
    missing.push('Camp');
  }

  if (missing.length > 0) {
    throw new Error(
      'Missing or invalid required field(s): ' +
      missing.join(', ')
    );
  }

  return {
    name: name,
    mobileNumber: mobileNumber,
    programme: programme,
    language: language,
    camp: camp,
    level: level,
    notes: notes,
    testDate: testDate
  };
}

function getDestinationSheetName_(programme, language, camp) {
  if (programme === 'Adults') {
    const adultSheet = ADULT_LANGUAGE_SHEETS[language];

    if (!adultSheet) {
      throw new Error(
        'No Adults destination is configured for language: ' +
        language
      );
    }

    return adultSheet;
  }

  if (programme === 'Private') {
    return 'PRIV';
  }

  if (programme === 'Kids') {
    const kidsSheet = KIDS_CAMP_SHEETS[camp];

    if (!kidsSheet) {
      throw new Error(
        'No Kids destination is configured for camp: ' +
        camp
      );
    }

    return kidsSheet;
  }

  if (programme === 'Youth') {
    const youthSheet = YOUTH_CAMP_SHEETS[camp];

    if (!youthSheet) {
      throw new Error(
        'No Youth destination is configured for camp: ' +
        camp
      );
    }

    return youthSheet;
  }

  throw new Error(
    'Invalid programme: ' + programme
  );
}

function getSheetByNameSafe_(spreadsheet, expectedName) {
  const sheets = spreadsheet.getSheets();
  const expectedId = Number(expectedName);

  if (Number.isInteger(expectedId) && expectedId > 0) {
    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets[index];

      if (sheet.getSheetId() === expectedId) {
        return sheet;
      }
    }

    throw new Error(
      'Destination sheet not found for gid: ' + expectedName +
      '. Available tabs: ' +
      sheets.map(function (sheet) {
        return '"' + sheet.getName() + '" (gid ' + sheet.getSheetId() + ')';
      }).join(', ')
    );
  }

  const directMatch = spreadsheet.getSheetByName(expectedName);

  if (directMatch) {
    return directMatch;
  }

  const normalizedExpected = normalizeSheetName_(expectedName);

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];

    if (normalizeSheetName_(sheet.getName()) === normalizedExpected) {
      return sheet;
    }
  }

  throw new Error(
    'Destination sheet not found: "' + expectedName +
    '". Available tabs: ' +
    sheets.map(function (sheet) {
      return '"' + sheet.getName() + '"';
    }).join(', ')
  );
}

function normalizeSheetName_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function ensureHeaderRow_(sheet) {
  const headerRow = CONFIG.HEADER_ROW;
  const headerRange =
    sheet.getRange(headerRow, 1, 1, EXPECTED_HEADERS.length);

  const mergedRanges = headerRange.getMergedRanges();

  mergedRanges.forEach(function (range) {
    range.breakApart();
  });

  EXPECTED_HEADERS.forEach(function (header, index) {
    const column = index + 1;
    const cell = sheet.getRange(headerRow, column);

    cell.clearDataValidations();
    cell.clearContent();
    cell.setValue(header);
    cell.setFontWeight('bold');
  });
}

function findHeaderRow_(sheet) {
  const headerRow = CONFIG.HEADER_ROW;

  const headers = [
    sheet.getRange(headerRow, 1).getDisplayValue(),
    sheet.getRange(headerRow, 2).getDisplayValue(),
    sheet.getRange(headerRow, 3).getDisplayValue(),
    sheet.getRange(headerRow, 4).getDisplayValue(),
    sheet.getRange(headerRow, 5).getDisplayValue(),
    sheet.getRange(headerRow, 6).getDisplayValue()
  ];

  if (!isExpectedHeaderRow_(headers)) {
    throw new Error(
      'Incorrect headers in "' + sheet.getName() +
      '". Row ' + headerRow +
      ' must be exactly: Name, Phone Number, Level, Date, Comments, Action.'
    );
  }

  return headerRow;
}

function isExpectedHeaderRow_(row) {
  return (
    normalizeHeader_(row[0]) === 'name' &&
    isPhoneHeader_(row[1]) &&
    normalizeHeader_(row[2]) === 'level' &&
    normalizeHeader_(row[3]) === 'date' &&
    isCommentsHeader_(row[4]) &&
    normalizeHeader_(row[5]) === 'action'
  );
}

function isPhoneHeader_(value) {
  const header = normalizeHeader_(value);

  return (
    header === 'phone number' ||
    header === 'mobile number' ||
    header === 'phone'
  );
}

function isCommentsHeader_(value) {
  const header = normalizeHeader_(value);

  return (
    header === 'comments' ||
    header === 'comment' ||
    header === 'notes'
  );
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findFirstAvailableRow_(sheet, headerRow) {
  const firstDataRow = headerRow + 1;
  const lastUsedRow = Math.max(sheet.getLastRow(), headerRow);

  if (lastUsedRow < firstDataRow) {
    return firstDataRow;
  }

  const rowCount = lastUsedRow - firstDataRow + 1;
  const names = sheet
    .getRange(firstDataRow, 1, rowCount, 1)
    .getDisplayValues();

  for (let index = names.length - 1; index >= 0; index -= 1) {
    if (String(names[index][0] || '').trim() !== '') {
      return firstDataRow + index + 1;
    }
  }

  return firstDataRow;
}

function normalizeProgramme_(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (normalized === 'adult' || normalized === 'adults') {
    return 'Adults';
  }

  if (normalized === 'kid' || normalized === 'kids') {
    return 'Kids';
  }

  if (
    normalized === 'youth' ||
    normalized === 'youths'
  ) {
    return 'Youth';
  }

  if (normalized === 'private' || normalized === 'priv') {
    return 'Private';
  }

  return '';
}

function normalizeLanguage_(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  const aliases = {
    'english': 'General English',
    'general english': 'General English',
    'conversation': 'Conversation',
    'convo': 'Conversation',
    'french': 'French',
    'spanish': 'Spanish',
    'german': 'German',
    'italian': 'Italian',
    'toefl': 'TOEFL',
    'tofel': 'TOEFL',
    'ielts': 'IELTS',
    'ilets': 'IELTS',
    'pte': 'PTE',
    'oet': 'OET'
  };

  return aliases[normalized] || '';
}

function normalizeCamp_(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  const aliases = {
    '1': 'Summer Camp 1',
    'camp 1': 'Summer Camp 1',
    'summer camp 1': 'Summer Camp 1',
    '2': 'Summer Camp 2',
    'camp 2': 'Summer Camp 2',
    'summer camp 2': 'Summer Camp 2',
    '3': 'Summer Camp 3',
    'camp 3': 'Summer Camp 3',
    'summer camp 3': 'Summer Camp 3',
    'winter': 'Winter Camp',
    'winter camp': 'Winter Camp'
  };

  return aliases[normalized] || '';
}

function parseRequiredDate_(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function safeCell_(value) {
  const text = String(value == null ? '' : value)
    .trim()
    .slice(0, 5000);

  return /^[=+\-@]/.test(text)
    ? "'" + text
    : text;
}

function getAllDestinationSheetNames_() {
  const combined = [];

  Object.keys(ADULT_LANGUAGE_SHEETS).forEach(function (key) {
    combined.push(ADULT_LANGUAGE_SHEETS[key]);
  });

  Object.keys(KIDS_CAMP_SHEETS).forEach(function (key) {
    combined.push(KIDS_CAMP_SHEETS[key]);
  });

  Object.keys(YOUTH_CAMP_SHEETS).forEach(function (key) {
    combined.push(YOUTH_CAMP_SHEETS[key]);
  });

  return combined.filter(function (name, index, array) {
    return array.indexOf(name) === index;
  });
}

function testAdultSubmission() {
  const result = doPost({
    parameter: {
      name: 'Test Candidate',
      mobileNumber: '01000000000',
      programme: 'Adults',
      language: 'General English',
      level: 'Beginner',
      testDate: '2026-06-28',
      notes: 'Apps Script test'
    }
  });

  Logger.log(result.getContent());
}

function findTestCandidate() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheets = spreadsheet.getSheets();
  const target = 'test candidate';
  const matches = [];

  sheets.forEach(function (sheet) {
    const lastRow = sheet.getLastRow();

    if (lastRow < 1) return;

    const values = sheet
      .getRange(1, 1, lastRow, 6)
      .getDisplayValues();

    values.forEach(function (row, index) {
      const rowText = row.join(' ').toLowerCase();

      if (rowText.indexOf(target) !== -1) {
        matches.push(
          sheet.getName() +
          ' row ' +
          (index + 1) +
          ': ' +
          row.join(' | ')
        );
      }
    });
  });

  Logger.log(
    matches.length
      ? matches.join('\n')
      : 'No Test Candidate found in this spreadsheet.'
  );
}

function createSuccessPage_(destinationSheetName, destinationRow, sheetId) {
  const safeSheetName = escapeHtml_(destinationSheetName);
  const safeRow = escapeHtml_(destinationRow);
  const spreadsheetUrl =
    'https://docs.google.com/spreadsheets/d/' +
    CONFIG.SPREADSHEET_ID +
    '/edit?gid=' +
    sheetId +
    '#gid=' +
    sheetId +
    '&range=A' +
    destinationRow;

  return HtmlService.createHtmlOutput(
    '<!doctype html>' +
    '<html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Submission Successful</title></head>' +
    '<body style="font-family:Arial,sans-serif;text-align:center;' +
    'padding:48px;background:#f4f4f9;color:#1a237e">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;' +
    'padding:32px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,.1)">' +
    '<h2 style="color:#28a745">Submission Successful</h2>' +
    '<p>The candidate was saved successfully.</p>' +
    '<p style="color:#666">Destination: ' + safeSheetName + '</p>' +
    '<p style="color:#666">Saved row: ' + safeRow + '</p>' +
    '<p><a href="' + spreadsheetUrl + '" target="_blank" ' +
    'style="color:#1a237e;font-weight:bold">Open saved row</a></p>' +
    '<p style="color:#666;font-size:13px">The form tab is still open. You can close this success tab.</p>' +
    '<button onclick="window.close()" style="margin-top:16px;padding:10px 18px;' +
    'border:0;border-radius:6px;background:#1a237e;color:#fff;cursor:pointer">' +
    'Close this tab</button>' +
    '</div></body></html>'
  );
}

function createErrorPage_(error, stage) {
  const message = escapeHtml_(
    error && error.message
      ? error.message
      : String(error)
  );

  const safeStage = escapeHtml_(stage || 'unknown step');

  return HtmlService.createHtmlOutput(
    '<!doctype html>' +
    '<html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Submission Error</title></head>' +
    '<body style="font-family:Arial,sans-serif;max-width:760px;' +
    'margin:40px auto;padding:24px;color:#842029">' +
    '<h2>The submission could not be saved.</h2>' +
    '<p><strong>Failed step:</strong> ' + safeStage + '</p>' +
    '<p>' + message + '</p>' +
    '<p style="color:#666;font-size:13px">The form tab is still open. You can close this error tab.</p>' +
    '<button onclick="window.close()" style="padding:10px 18px;' +
    'border:0;border-radius:6px;cursor:pointer">' +
    'Close this tab</button>' +
    '</body></html>'
  );
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

