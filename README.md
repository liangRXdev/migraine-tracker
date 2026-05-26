# 🧠✨ 小腦袋日記 — 偏頭痛追蹤器

個人偏頭痛追蹤 PWA，記錄每日症狀、生活型態與誘發因子，透過趨勢圖表與 AI 分析幫助找出頭痛規律。

**Live Demo →** https://liangrxdev.github.io/migraine-tracker/

---

## 功能

| 頁籤 | 說明 |
|------|------|
| 📝 **紀錄** | 每日填寫頭痛狀況、疼痛位置、肩頸痠痛、睡眠時數與品質、壓力、月經週期、久坐時間、運動、咖啡因 |
| 📊 **趨勢** | 最近 14 日折線圖（頭痛強度 / 肩頸 / 睡眠）、30 日統計摘要、各星期頭痛發生率長條圖 |
| 🧠 **洞察** | 個人 Trigger 自動排行（睡眠不足、經前期、久坐、高壓、咖啡因）、本週 vs 上週比較、Gemini AI 分析 |

---

## 技術架構

```
Frontend (GitHub Pages)          Backend (Google Apps Script)
React + Vite                     ├─ 儲存記錄 → Google Sheets
Recharts 圖表                    └─ 呼叫 Gemini API（AI 分析）
```

- **前端**：React 18、Vite 6、Recharts
- **後端**：Google Apps Script — 作為 API proxy，Gemini API Key 存於 `PropertiesService`（不寫死）
- **資料儲存**：Google Sheets（每列一天記錄）
- **部署**：GitHub Actions → GitHub Pages

---

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置
npm run build
```

> 若要使用真實資料，需在 `src/App.jsx` 的 `GAS_URL` 填入自己的 GAS 部署網址。  
> 測試用途可將 `DEMO_MODE` 改為 `true`，會產生 30 天假資料。

---

## GAS 後端設定

1. 在 Google Apps Script 建立新專案，部署為「網頁應用程式」（Anyone 可存取）
2. 在 GAS 的「專案設定 → 指令碼屬性」加入：
   - `GEMINI_API_KEY`：你的 Gemini API Key
3. GAS 需處理以下 endpoint：

| action | 方法 | 說明 |
|--------|------|------|
| `fetch` | GET | 回傳所有記錄 `{ records: [...] }` |
| `record` | POST | 寫入當日記錄至 Sheets |
| `ai_analysis` | POST | 轉送 prompt 至 Gemini，回傳分析文字 |

---

## 部署流程

Push 到 `main` branch 後，GitHub Actions 自動執行：

```
build job  →  npm ci + npm run build
deploy job →  actions/deploy-pages → GitHub Pages
```

Workflow 檔案：`.github/workflows/deploy.yml`

---

## 記錄欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `headache` | 0/1 | 是否頭痛 |
| `intensity` | 0–10 | 頭痛強度 |
| `location` | string[] | 疼痛位置（左側/右側/後腦/眼窩/整圈） |
| `neckPain` | 0–10 | 肩頸痠痛程度 |
| `sleepHours` | 0–14 | 睡眠時數 |
| `sleepQuality` | 1–5 | 睡眠品質（⭐ 評分） |
| `menstrualPhase` | string | 無/經前/月經中/排卵期 |
| `stress` | 1–5 | 壓力程度 |
| `sittingTime` | string | <2hr / 2-6hr / >6hr |
| `exercise` | 0/1 | 是否運動 |
| `caffeine` | 0/1 | 是否攝取咖啡因 |
