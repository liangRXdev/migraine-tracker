# migraine-tracker — 專案規則

個人偏頭痛追蹤 PWA。前端 React 18 + Vite（GitHub Pages），後端 Google Apps Script（Sheets 儲存 + Gemini 分析）。

**兩套部署互相獨立**：前端 push `main` → GH Actions 自動建置上 Pages；後端要 `cd gas-backend && clasp push` **手動部署**。改了 `程式碼.js` 卻只 push git，線上後端不會變。

---

## 認證：token 是公開的，密碼才是閘門

這點務必理解清楚，不要弄反：

- **`token`（`API_SECRET`）會被打包進前端 bundle**，任何人打開 DevTools 都看得到。它擋的是隨機掃描，不是有心人
- **真正的閘門是密碼**：sha256 存在 Sheet 的「密碼」工作表 A1。所有讀寫與 AI 端點都必須通過 `checkPassword_()`
- `verify_password` 是唯一不先擋密碼的 action（它本身就是驗密碼用的）

**`!SECRET ||` 的短路判斷不可拿掉**（`程式碼.js:36`、`:66`）。若 `API_SECRET` 未設定就一律 401——這是修過的 null-bypass 漏洞，簡化成 `body.token !== SECRET` 會讓未設定屬性時 `undefined !== undefined` 為 false 而全面放行。

**資料端點一律走 POST**。`doGet` 只保留 `ping`——密碼與資料不能出現在 URL、瀏覽器歷史或 GAS 執行記錄裡。不要為了方便加 GET 版本。

密碼設定用 `setPassword('明文')` 執行一次，**執行完把引數清掉**，避免明文留在程式碼裡。

## Gemini 呼叫

```js
thinkingConfig: { thinkingBudget: 0 }   // 程式碼.js:301
```

**不可移除**。gemini-2.5-flash 的 thinking token 會吃光輸出額度，導致回覆被靜默截斷（不是報錯，是回傳半截 JSON）。這個坑踩過，換模型前先確認新模型的 thinking 行為。

## 敏感設定

`SHEET_ID` / `API_SECRET` / `GEMINI_API_KEY` / `WEATHER_API_KEY` **全部走 `PropertiesService`**，不得寫死在 `程式碼.js`。新增外部服務照此辦理。

例外：`GAS_URL` 硬編在 `src/App.jsx:9`——那是公開的 Web App 端點，本來就會出現在前端，不是秘密。

`VITE_GAS_TOKEN` 由 GH Actions secret 於建置時注入（`deploy.yml`）。改 token 要同時更新 GAS 指令碼屬性與 repo secret，兩邊不同步會全站 401。

## 前端

- Vite + `vite-plugin-pwa`（Workbox，`registerType: 'autoUpdate'`）
- **`scope` 與 `start_url` 都是 `/migraine-tracker/`**——GH Pages 子路徑部署，改 repo 名要同步改 `vite.config.js`
- 字型 `Zen Maru Gothic`（此專案獨有，與其他工具不同調，是刻意的個人化設計）
- 主色 `#D4A0B9` / 底色 `#FFF8F3`

## 資料

- 一天一列，`findRowByDate_()` 以日期為鍵——同日重複送出是**更新**不是新增
- 這是個人健康資料，Sheet 不對外分享；repo 是 public，**不要把任何實際紀錄或 Sheet ID 貼進 README、issue 或測試資料**
