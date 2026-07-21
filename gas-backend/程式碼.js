/**
 * 偏頭痛追蹤系統 — GAS 後端 API
 * 
 * 部署方式：
 * 1. Google Sheets 建立新試算表，命名工作表為 "Records"
 * 2. 工具 → Apps Script → 貼上此程式碼
 * 3. 設定 SHEET_ID 和 WEATHER_API_KEY
 * 4. 部署 → 新增部署 → 網頁應用程式 → 存取權限：所有人
 * 5. 取得部署 URL 作為前端 API endpoint
 * 
 * Sheet "Records" 欄位結構：
 * A:timestamp | B:date | C:headache | D:intensity | E:location | 
 * F:neckPain | G:sleepHours | H:sleepQuality | I:menstrualPhase |
 * J:stress | K:sittingTime | L:exercise | M:caffeine |
 * N:weather_temp | O:weather_humidity | P:weather_pressure | Q:weather_desc |
 * R:notes
 */

// ========== 設定區 ==========
// SHEET_ID / API_SECRET / GEMINI_API_KEY / WEATHER_API_KEY 皆由指令碼屬性管理，不寫死於程式碼
const CONFIG = {
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
  SHEET_NAME: 'Records',
  // GEMINI_API_KEY / WEATHER_API_KEY 皆改由 PropertiesService 管理，不寫死於程式碼
  WEATHER_API_KEY: PropertiesService.getScriptProperties().getProperty('WEATHER_API_KEY'), // https://openweathermap.org/api
  // 台中座標（可依實際位置調整）
  LAT: 24.1477,
  LON: 120.6736,
};

// ========== API 路由 ==========
  const SECRET = PropertiesService.getScriptProperties().getProperty("API_SECRET");

  function doPost(e) {
    const body = JSON.parse(e.postData.contents);
    if (!SECRET || body.token !== SECRET) {
      return jsonResponse_({ error: "Unauthorized" }, 401);
    }
    try {
      const action = body.action || 'record';

      // verify_password 本身用來驗證密碼，不先擋
      if (action === 'verify_password') {
        return jsonResponse_({ valid: checkPassword_(body.password) });
      }

      // token 已是公開值（會被打包進前端 bundle），密碼才是真正的閘門：
      // 所有讀寫 / AI 端點都必須通過密碼驗證
      if (!checkPassword_(body.password)) {
        return jsonResponse_({ error: 'Forbidden' }, 403);
      }

      switch (action) {
        case 'record':       return jsonResponse_(saveRecord_(body));
        case 'ai_analysis':  return jsonResponse_(callGemini_(body));
        case 'fetch':        return jsonResponse_(fetchRecords_(body));
        case 'stats':        return jsonResponse_(getStats_(body));
        default:             return jsonResponse_({ error: 'Unknown action' }, 400);
      }
    } catch (err) {
      return jsonResponse_({ error: err.message }, 500);
    }
  }

function doGet(e) {
  if (!SECRET || e.parameter.token !== SECRET) {
    return jsonResponse_({ error: "Unauthorized" }, 401);
  }
  try {
    const action = e.parameter.action || 'ping';
    if (action === 'ping') {
      return jsonResponse_({ status: 'ok', ts: new Date().toISOString() });
    }
    // 資料端點一律改走 POST（密碼與資料不出現在 URL / 瀏覽器歷史 / log）
    return jsonResponse_({ error: 'Use POST for data actions' }, 400);
  } catch (err) {
    return jsonResponse_({ error: err.message }, 500);
  }
}

// ========== 紀錄寫入 ==========

function saveRecord_(data) {
  const sheet = getSheet_();
  const now = new Date();
  const dateStr = data.date || Utilities.formatDate(now, 'Asia/Taipei', 'yyyy-MM-dd');

  // 檢查今日是否已有紀錄（允許覆蓋）
  const existingRow = findRowByDate_(sheet, dateStr);

  // 自動抓天氣
  const weather = (data.weather_temp !== undefined && data.weather_temp !== '')
      ? { temp: data.weather_temp, humidity: '', pressure: data.weather_pressure, desc: '' }
      : fetchWeather_();

  const row = [
    now.toISOString(),                           // A: timestamp
    dateStr,                                      // B: date
    data.headache ? 1 : 0,                        // C: headache (0/1)
    data.headache ? (data.intensity || 0) : 0,    // D: intensity (0-10)
    data.headache ? (Array.isArray(data.location) ? data.location.join(',') : data.location || '') : '',   // E: location
    data.neckPain || 0,                           // F: neckPain (0-10)
    data.sleepHours || 0,                         // G: sleepHours
    data.sleepQuality || 0,                       // H: sleepQuality (1-5)
    data.menstrualPhase || '無',                   // I: menstrualPhase
    data.stress || 0,                             // J: stress (1-5)
    data.sittingTime || '',                       // K: sittingTime
    data.exercise ? 1 : 0,                        // L: exercise (0/1)
    data.caffeine ? 1 : 0,                        // M: caffeine (0/1)
    weather.temp,                                 // N: weather_temp
    weather.humidity,                             // O: weather_humidity
    weather.pressure,                             // P: weather_pressure
    weather.desc,                                 // Q: weather_desc
    data.notes || '',                             // R: notes
    Array.isArray(data.neckSide) ? data.neckSide.join(',') : (data.neckSide || ''),
    data.lastPeriodDate || '',
    data.waterOver1500 === true ? 'TRUE' : data.waterOver1500 === false ? 'FALSE' : '',
    data.weather_code !== undefined ? data.weather_code : '',
  ];

  if (existingRow > 0) {
    // 覆蓋既有紀錄
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    return { success: true, action: 'updated', date: dateStr };
  } else {
    sheet.appendRow(row);
    return { success: true, action: 'created', date: dateStr };
  }
}

// ========== 紀錄讀取 ==========

function fetchRecords_(params) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { records: [] };

  const headers = data[0];
  let records = data.slice(1).map(row => {
  const obj = rowToObj_(headers, row);
  // Date 物件轉字串
  if (obj.date instanceof Date) {
    obj.date = Utilities.formatDate(obj.date, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  return obj;
});

  // 日期範圍篩選
  if (params.from) {
    records = records.filter(r => r.date >= params.from);
  }
  if (params.to) {
    records = records.filter(r => r.date <= params.to);
  }

  // 預設回傳最近 90 天
  if (!params.from && !params.to) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = Utilities.formatDate(cutoff, 'Asia/Taipei', 'yyyy-MM-dd');
    records = records.filter(r => r.date >= cutoffStr);
  }

  // 按日期排序（新→舊）
  records.sort((a, b) => b.date.localeCompare(a.date));

  return { records, count: records.length };
}

// ========== 統計摘要 ==========

function getStats_(params) {
  const { records } = fetchRecords_(params);
  if (records.length === 0) return { error: 'No data' };

  const total = records.length;
  const headacheDays = records.filter(r => r.headache == 1).length;
  const avgIntensity = headacheDays > 0
    ? records.filter(r => r.headache == 1).reduce((s, r) => s + Number(r.intensity), 0) / headacheDays
    : 0;
  const avgSleep = records.reduce((s, r) => s + Number(r.sleepHours), 0) / total;
  const avgNeckPain = records.reduce((s, r) => s + Number(r.neckPain), 0) / total;

  // Trigger 關聯分析（簡易版）
  const triggers = analyzeTriggers_(records);

  return {
    totalDays: total,
    headacheDays,
    headacheRate: Math.round((headacheDays / total) * 100),
    avgIntensity: Math.round(avgIntensity * 10) / 10,
    avgSleep: Math.round(avgSleep * 10) / 10,
    avgNeckPain: Math.round(avgNeckPain * 10) / 10,
    triggers,
  };
}

// ========== Trigger 關聯分析 ==========

function analyzeTriggers_(records) {
  const headacheRecords = records.filter(r => r.headache == 1);
  const noHeadache = records.filter(r => r.headache == 0);
  if (headacheRecords.length < 3) return [];

  const triggers = [];

  // 睡眠不足 (<6hr)
  const lowSleepHA = headacheRecords.filter(r => Number(r.sleepHours) < 6).length;
  const lowSleepNoHA = noHeadache.filter(r => Number(r.sleepHours) < 6).length;
  const lowSleepTotal = lowSleepHA + lowSleepNoHA;
  if (lowSleepTotal > 0) {
    triggers.push({
      name: '睡眠不足 (<6hr)',
      rate: Math.round((lowSleepHA / lowSleepTotal) * 100),
      count: lowSleepTotal,
    });
  }

  // 月經前
  const preMensHA = headacheRecords.filter(r => r.menstrualPhase === '經前').length;
  const preMensNoHA = noHeadache.filter(r => r.menstrualPhase === '經前').length;
  const preMensTotal = preMensHA + preMensNoHA;
  if (preMensTotal > 0) {
    triggers.push({
      name: '經前期',
      rate: Math.round((preMensHA / preMensTotal) * 100),
      count: preMensTotal,
    });
  }

  // 久坐 >6hr
  const longSitHA = headacheRecords.filter(r => r.sittingTime === '>6hr').length;
  const longSitNoHA = noHeadache.filter(r => r.sittingTime === '>6hr').length;
  const longSitTotal = longSitHA + longSitNoHA;
  if (longSitTotal > 0) {
    triggers.push({
      name: '久坐 >6hr',
      rate: Math.round((longSitHA / longSitTotal) * 100),
      count: longSitTotal,
    });
  }

  // 高壓力 (>=4)
  const highStressHA = headacheRecords.filter(r => Number(r.stress) >= 4).length;
  const highStressNoHA = noHeadache.filter(r => Number(r.stress) >= 4).length;
  const highStressTotal = highStressHA + highStressNoHA;
  if (highStressTotal > 0) {
    triggers.push({
      name: '高壓力 (≥4)',
      rate: Math.round((highStressHA / highStressTotal) * 100),
      count: highStressTotal,
    });
  }

  // 低氣壓 (<1008 hPa)
  const lowPressureHA = headacheRecords.filter(r => Number(r.weather_pressure) > 0 && Number(r.weather_pressure) < 1008).length;
  const lowPressureNoHA = noHeadache.filter(r => Number(r.weather_pressure) > 0 && Number(r.weather_pressure) < 1008).length;
  const lowPressureTotal = lowPressureHA + lowPressureNoHA;
  if (lowPressureTotal > 0) {
    triggers.push({
      name: '低氣壓 (<1008hPa)',
      rate: Math.round((lowPressureHA / lowPressureTotal) * 100),
      count: lowPressureTotal,
    });
  }

  // 咖啡因
  const caffeineHA = headacheRecords.filter(r => r.caffeine == 1).length;
  const caffeineNoHA = noHeadache.filter(r => r.caffeine == 1).length;
  const caffeineTotal = caffeineHA + caffeineNoHA;
  if (caffeineTotal > 0) {
    triggers.push({
      name: '咖啡因攝取',
      rate: Math.round((caffeineHA / caffeineTotal) * 100),
      count: caffeineTotal,
    });
  }

  // 按關聯度排序
  triggers.sort((a, b) => b.rate - a.rate);
  return triggers;
}

// ========== Gemini AI 分析 ==========
// API Key 設定方式：GAS 編輯器 → 專案設定 → 指令碼屬性 → 新增 GEMINI_API_KEY

function callGemini_(data) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return { error: 'GEMINI_API_KEY 未設定，請至 GAS 指令碼屬性新增。' };

  const prompt = data.prompt;
  if (!prompt) return { error: 'Missing prompt' };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },  // 關閉 thinking，避免思考 token 吃光輸出額度導致回覆被截斷
      },
    };
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const result = JSON.parse(res.getContentText());
    if (result.error) return { error: result.error.message };
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '分析暫時無法完成，請稍後再試～';
    return { text };
  } catch (e) {
    Logger.log('Gemini API error: ' + e.message);
    return { error: 'Gemini 呼叫失敗：' + e.message };
  }
}

// ========== 天氣 API ==========

function fetchWeather_() {
  const defaultWeather = { temp: '', humidity: '', pressure: '', desc: '' };
  if (!CONFIG.WEATHER_API_KEY) return defaultWeather;  // 指令碼屬性未設定 WEATHER_API_KEY 時跳過天氣

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${CONFIG.LAT}&lon=${CONFIG.LON}&appid=${CONFIG.WEATHER_API_KEY}&units=metric&lang=zh_tw`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());

    return {
      temp: data.main?.temp || '',
      humidity: data.main?.humidity || '',
      pressure: data.main?.pressure || '',
      desc: data.weather?.[0]?.description || '',
    };
  } catch (e) {
    Logger.log('Weather API error: ' + e.message);
    return defaultWeather;
  }
}

// ========== 工具函式 ==========

function getSheet_() {
  if (!CONFIG.SHEET_ID) throw new Error('SHEET_ID 未設定，請至 GAS 指令碼屬性新增。');
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // 自動建立 header
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'timestamp', 'date', 'headache', 'intensity', 'location',
      'neckPain', 'sleepHours', 'sleepQuality', 'menstrualPhase',
      'stress', 'sittingTime', 'exercise', 'caffeine',
      'weather_temp', 'weather_humidity', 'weather_pressure', 'weather_desc',
      'notes',
      'neckSide', 'lastPeriodDate', 'waterOver1500', 'weather_code',   // ← 新增
    ]);
  }
  return sheet;
}

function findRowByDate_(sheet, dateStr) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === dateStr) return i + 1; // 1-indexed
  }
  return -1;
}

function rowToObj_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
}

function jsonResponse_(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== 初始化（手動執行一次） ==========

function initSheet() {
  getSheet_();
  Logger.log('Sheet initialized successfully.');
}

// ========== 密碼驗證（SHA-256 雜湊比對，不存明文） ==========
// ⚠️ 一次性設定：在 GAS 編輯器手動執行 setPassword('你的密碼')，
//    會把密碼的 SHA-256 雜湊寫入「密碼」分頁 A1（取代原本的明文）。
//    設定完可把引數清掉，避免明文殘留在程式碼。

function setPassword(plain) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName('密碼') || ss.insertSheet('密碼');
  sheet.getRange('A1').setValue(sha256Hex_(String(plain)));
  Logger.log('密碼已雜湊儲存完成（A1 現在是 hash，非明文）');
}

function checkPassword_(provided) {
  if (!provided) return false;
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const pwdSheet = ss.getSheetByName('密碼');
  if (!pwdSheet) return false;
  const stored = String(pwdSheet.getRange('A1').getValue()).trim();
  if (!stored) return false;
  return stored === sha256Hex_(String(provided));
}

function sha256Hex_(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}
