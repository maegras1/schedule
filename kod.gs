
const SPREADSHEET_ID = "1O07Bv15T_r5sL20D1LhLgM3fO2zQ8gE0Q9g8f7h6g5Y";
const DATA_KEY = "grafikKalinowaData";
const SHEET_NAME = "DATA";
const EMPLOYEES_SHEET_NAME = "Pracownicy";
const LEAVES_SHEET_NAME = "Urlopy";

// Funkcja GET będzie teraz obsługiwać tylko proste żądania testowe, jeśli zajdzie taka potrzeba.
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Skrypt działa."}))
    .setMimeType(ContentService.MimeType.JSON)
    .withHeaders({'Access-Control-Allow-Origin': '*'});
}

function doPost(e) {
  let action;
  let data;
  
  try {
    // Sprawdzamy, czy dane są przesyłane w ciele (body) żądania
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
      action = data.action;
    } else {
      // Jeśli nie, sprawdzamy parametry URL (dla prostszych akcji)
      action = e.parameter.action;
    }

    let response;
    
    switch (action) {
      case "loadSchedule":
        response = loadSchedule();
        break;
      case "getEmployees":
        response = getEmployees();
        break;
      case "saveSchedule":
        response = saveSchedule(data.payload);
        break;
      case "addEmployee":
        response = addEmployee(data.payload);
        break;
      case "deleteEmployee":
        response = deleteEmployee(data.payload);
        break;
      case "saveLeaves":
        response = saveLeaves(data.payload);
        break;
      default:
        throw new Error("Nieznana akcja POST: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({'Access-Control-Allow-Origin': '*'});
      
  } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Błąd po stronie serwera: " + error.message,
        details: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .withHeaders({'Access-Control-Allow-Origin': '*'});
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
  return JSON.parse(scheduleData);
}

function saveSchedule(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const jsonData = JSON.stringify(payload);

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
  
  CacheService.getScriptCache().remove("scheduleData");

  return { status: "success", message: "Harmonogram zapisany pomyślnie." };
}

function getEmployees() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EMPLOYEES_SHEET_NAME);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).map(row => row[0]);
}

function addEmployee(payload) {
    const { name } = payload;
    if (!name) throw new Error("Nazwa pracownika jest wymagana.");
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(EMPLOYEES_SHEET_NAME);
    sheet.appendRow([name]);
    return { status: "success", message: "Pracownik dodany pomyślnie." };
}

function deleteEmployee(payload) {
    const { name } = payload;
    if (!name) throw new Error("Nazwa pracownika jest wymagana do usunięcia.");
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

function saveLeaves(payload) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(LEAVES_SHEET_NAME);
  sheet.clear(); 
  const headers = ["Pracownik", "Dni Urlopu"];
  const dataToWrite = [headers];
  for (const employee in payload) {
    dataToWrite.push([employee, payload[employee]]);
  }
  sheet.getRange(1, 1, dataToWrite.length, headers.length).setValues(dataToWrite);

  return { status: "success", message: "Dane urlopowe zapisane pomyślnie." };
}
