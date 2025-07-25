
const SPREADSHEET_ID = "1O07Bv15T_r5sL20D1LhLgM3fO2zQ8gE0Q9g8f7h6g5Y";
const DATA_KEY = "grafikKalinowaData";
const SHEET_NAME = "DATA";
const EMPLOYEES_SHEET_NAME = "Pracownicy";
const LEAVES_SHEET_NAME = "Urlopy";


function doGet(e) {
  const action = e.parameter.action;
  let response;

  try {
    if (action === "loadSchedule") {
      response = loadSchedule();
    } else if (action === "getEmployees") {
      response = getEmployees();
    } else {
      throw new Error("Nieznana akcja GET: " + action);
    }
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({
        'Access-Control-Allow-Origin': '*'
      });
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({
        'Access-Control-Allow-Origin': '*'
      });
  }
}

function doPost(e) {
  const action = e.parameter.action;
  let response;

  try {
    const data = JSON.parse(e.postData.contents);

    if (action === "saveSchedule") {
      response = saveSchedule(data);
    } else if (action === "addEmployee") {
      response = addEmployee(data);
    } else if (action === "deleteEmployee") {
      response = deleteEmployee(data);
    } else if (action === "saveLeaves") {
      response = saveLeaves(data);
    } else {
      throw new Error("Nieznana akcja POST: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
  } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Błąd po stronie serwera: " + error.message,
        details: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
  }
}

// Obsługa preflight requests dla CORS
function doOptions(e) {
    return ContentService.createTextOutput()
        .withHeaders({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
}


function loadSchedule() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = "scheduleData";
  let cached = cache.get(CACHE_KEY);
  if (cached != null) {
    return JSON.parse(cached);
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let scheduleData = '{}';

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === DATA_KEY) {
      scheduleData = values[i][1];
      break;
    }
  }
  cache.put(CACHE_KEY, scheduleData, 3600);
  return JSON.parse(scheduleData);
}

function saveSchedule(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const jsonData = JSON.stringify(data);

  let keyFound = false;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === DATA_KEY) {
      sheet.getRange(i + 1, 2).setValue(jsonData);
      keyFound = true;
      break;
    }
  }

  if (!keyFound) {
    sheet.appendRow([DATA_KEY, jsonData]);
  }

  const cache = CacheService.getScriptCache();
  cache.put("scheduleData", jsonData, 3600); // Aktualizacja cache

  return {
    status: "success",
    message: "Harmonogram zapisany pomyślnie."
  };
}


function getEmployees() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EMPLOYEES_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  // Pomijamy nagłówek, zwracamy tylko imiona i nazwiska
  return data.slice(1).map(row => row[0]);
}

function addEmployee(employeeData) {
    const { name } = employeeData;
    if (!name) {
        throw new Error("Nazwa pracownika jest wymagana.");
    }
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EMPLOYEES_SHEET_NAME);
    sheet.appendRow([name]);
    return { status: "success", message: "Pracownik dodany pomyślnie." };
}

function deleteEmployee(employeeData) {
    const { name } = employeeData;
    if (!name) {
        throw new Error("Nazwa pracownika jest wymagana do usunięcia.");
    }
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EMPLOYEES_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i][0] === name) {
            sheet.deleteRow(i + 1);
            return { status: "success", message: "Pracownik usunięty pomyślnie." };
        }
    }
    throw new Error("Nie znaleziono pracownika o podanej nazwie.");
}

function saveLeaves(leavesData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LEAVES_SHEET_NAME);
  sheet.clear(); // Czyścimy arkusz przed zapisem nowych danych
  const headers = ["Pracownik", "Dni Urlopu"];
  const dataToWrite = [headers];
  for (const employee in leavesData) {
    dataToWrite.push([employee, leavesData[employee]]);
  }
  sheet.getRange(1, 1, dataToWrite.length, headers.length).setValues(dataToWrite);

  return {
    status: "success",
    message: "Dane urlopowe zapisane pomyślnie."
  };
}
