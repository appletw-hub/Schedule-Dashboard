/**
 * 【日程管理】Google Apps Script (GAS) 後端資料庫 API
 * 
 * 使用方式：
 * 1. 在 Google 雲端硬碟建立一個新的 Google 試算表 (Google Sheets)。
 * 2. 點擊選單「擴充功能」->「Apps Script」。
 * 3. 貼上此 Code.gs 原始碼並儲存。
 * 4. 點擊右上角「部署」->「新增部署」。
 * 5. 種類選擇「Web 應用程式」。
 * 6. 執行身份選「我」，誰有權存取選「任何人 (Anyone)」。
 * 7. 複製獲得的 Web App URL，填入【日程管理看板】的「後端資料庫」設定中。
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 檢查或建立工作表
  var sheetTasks = getOrCreateSheet(ss, "Tasks");
  var sheetCategories = getOrCreateSheet(ss, "Categories");

  var tasks = readTasksFromSheet(sheetTasks);
  var categories = readCategoriesFromSheet(sheetCategories);

  var output = {
    status: "success",
    tasks: tasks,
    categories: categories
  };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheetTasks = getOrCreateSheet(ss, "Tasks");
    var sheetCategories = getOrCreateSheet(ss, "Categories");

    if (data.categories && Array.isArray(data.categories)) {
      writeCategoriesToSheet(sheetCategories, data.categories);
    }

    if (data.tasks && Array.isArray(data.tasks)) {
      writeTasksToSheet(sheetTasks, data.tasks);
    }

    var result = { status: "success", message: "Data synced successfully" };
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorResult = { status: "error", message: err.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 輔助函式：取得或建立工作表
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "Tasks") {
      sheet.appendRow(["ID", "Name", "Category", "Color", "Date", "Priority", "Completed", "Desc"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold");
    } else if (sheetName === "Categories") {
      sheet.appendRow(["CategoryName"]);
      sheet.getRange(1, 1, 1, 1).setFontWeight("bold");
    }
  }
  return sheet;
}

// 讀取 Tasks
function readTasksFromSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  var tasks = [];
  if (data.length <= 1) return tasks;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      tasks.push({
        id: String(row[0]),
        name: String(row[1] || ""),
        category: String(row[2] || ""),
        color: String(row[3] || "YOLK"),
        date: formatDateString(row[4]),
        priority: String(row[5] || "medium"),
        completed: row[6] === true || row[6] === "true",
        desc: String(row[7] || "")
      });
    }
  }
  return tasks;
}

// 寫入 Tasks
function writeTasksToSheet(sheet, tasks) {
  sheet.clearContents();
  sheet.appendRow(["ID", "Name", "Category", "Color", "Date", "Priority", "Completed", "Desc"]);
  sheet.getRange(1, 1, 1, 8).setFontWeight("bold");

  var rows = [];
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    rows.push([
      t.id,
      t.name,
      t.category,
      t.color,
      t.date,
      t.priority,
      t.completed,
      t.desc || ""
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}

// 讀取 Categories
function readCategoriesFromSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  var categories = [];
  if (data.length <= 1) return ["前端開發", "社群選題", "會議與企劃", "日常庶務"];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) categories.push(String(data[i][0]));
  }
  return categories;
}

// 寫入 Categories
function writeCategoriesToSheet(sheet, categories) {
  sheet.clearContents();
  sheet.appendRow(["CategoryName"]);
  sheet.getRange(1, 1, 1, 1).setFontWeight("bold");

  var rows = categories.map(function(c) { return [c]; });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 1).setValues(rows);
  }
}

function formatDateString(d) {
  if (!d) return "";
  if (d instanceof Date) {
    var y = d.getFullYear();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return y + "-" + m + "-" + day;
  }
  return String(d);
}
