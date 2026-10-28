# 中油綠能研發大樓新建工程釋疑資訊平台

這是可直接上傳 GitHub Pages 的網站原始碼與資料快照備份。
網站檔案已整理到本資料夾根目錄，不需要安裝套件或編譯，也不需要 API 金鑰。

備份日期：2026-10-28（臺灣時間）。釋疑資料基準：2026-10-27。

## 先讀這一段：資料與存取範圍

本包包含目前真實工程釋疑原文、回覆與專案文件連結，並非示範資料。
若只想備份，請先使用私人 GitHub 儲存庫，保持 Pages 關閉。
若要上線給外部使用，請先確認這些資料可供該範圍的人員閱覽。

一般 GitHub Pages 網站公開可讀；私人儲存庫不會自動讓 Pages 網站變成私人。
原網站由託管環境提供的 ChatGPT 登入與私人存取限制，不包含在這些靜態檔案內。
GitHub 原生私人 Pages 有 Enterprise Cloud 組織等適用條件；需要限定專案成員時，應另配置具存取控制的託管環境。
靜態頁面內加一個前端密碼欄位，無法保護同目錄的 JSON 資料。

官方說明：
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site

## 方案一：只備份到 GitHub

1. 解壓縮下載的 ZIP。
2. 在 GitHub 建立私人（Private）儲存庫，例如 `cpc-rfi-islands`。
3. 進入儲存庫，選擇 Upload files 或 Add file → Upload files。
4. 開啟解壓後的 `cpc-rfi-github-pages` 資料夾，上傳其內部檔案與資料夾。
5. 確認儲存庫根目錄直接看得到 `index.html`、`app.js` 與 `data.json`，再提交（Commit changes）。
6. 不啟用 Pages，即完成原始碼與資料快照備份。

ZIP 本身也能當封存檔保存；但要編輯程式、追蹤版本或使用 Pages，應上傳解壓後的內容。
如果 Windows 檔案總管未顯示 `.nojekyll`、`.gitignore`，可另外在 GitHub 建立同名檔案。
`.nojekyll` 為空檔，表示略過 Jekyll 產生流程。

## 方案二：使用 GitHub Pages 發布網站

請先確認資料公開範圍，再執行本段。

GitHub Free 可對公開儲存庫使用 Pages；私人儲存庫發布支援依 GitHub 方案而定。

1. 依方案一上傳解壓後的內容。
2. 開啟儲存庫的 Settings → Pages。
3. Build and deployment 的 Source 選擇 Deploy from a branch。
4. Branch 選擇 `main`（若儲存庫預設分支另有名稱，請選該分支）。
5. Folder 選擇 `/(root)`，按 Save。
6. 等待部署完成，從 Pages 頁面開啟 GitHub 顯示的網站網址。

一般專案網址形如 `https://你的帳號.github.io/cpc-rfi-islands/`。
本包使用相對路徑，可放在儲存庫名稱對應的子路徑。

**不要直接把 ZIP 當成網站首頁，也不要把外層資料夾再套進儲存庫。**
正確位置是儲存庫根目錄的 `index.html`。
本包不含 GitHub Actions 自動化設定，使用上面的分支發布即可。

官方說明：
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 已保留功能

- 9 座主題六角島與中央研發大樓；暖色微縮模型城市、旋轉、縮放及暫停。
- 30 位走動人物，每輪最多兩人提出所屬島嶼的真實釋疑，約顯示 5 秒。
- 點擊泡泡查看完整釋疑；右上可關閉提問。
- HP＝已處理／全部問題，處理越多血量越滿；桌面側欄、手機下方顯示。
- 釋疑搜尋、篩選、排序、關注、CSV 匯出、圖說資料庫連結。
- 原格式建築與機電 `.xlsx` 匯入（使用瀏覽器原生解壓縮能力）。

目前快照：157 筆 RFI（138 已回覆、18 待回覆、1 待核對），另有 98 筆審查／需求變更明細、19 個圖說檔案／資料夾入口。
「已回覆」並不等於「已結案」。

## 資料如何更新

**個人試算與查看：** 在網站資料版本面板匯入原格式 Excel，結果只存在目前裝置、瀏覽器與網站來源（localStorage），不會寫回 GitHub。
原網址與 GitHub Pages 網址使用不同的瀏覽器儲存空間，個人匯入、關注與偏好不會自動搬移。

**讓所有使用者看到新版：** 需把新版資料轉成網站所用的 `data.json` 格式，提交至 GitHub 並重新發布。
目前沒有 Excel 轉 JSON 的命令列工具，也沒有自動同步 Google Drive／Sheets；不能只把 `.xlsx` 放進儲存庫就視為資料更新。
網站的 CSV 匯出是篩選結果清單，不是可完整還原的 `data.json`。
如需後續共同維護，可再加入受控的資料更新流程或後端。

Drive 與 NotebookLM 仍依 Google 原有帳號權限開啟；本包只包含連結與目錄，不包含外部文件本體，也未備份 NotebookLM 內文。
本包未包含原始 `.xlsx` 檔，請另外保留原始管理表；`data.json` 已包含供目前網站使用的來源工作表快照。

## 在自己電腦預覽

請用本機 HTTP 伺服器開啟，直接雙擊 `index.html` 可能因瀏覽器限制而無法載入模組或資料。

若已安裝 Python，在本資料夾開啟終端機：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Windows 若使用 Python Launcher，可改用：

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

然後開啟 http://127.0.0.1:8000/ 。停止預覽請按 Ctrl+C。
使用較新的 Chrome、Edge 或 Safari；Excel 匯入需要支援原生 `DecompressionStream('deflate-raw')`。
網站不依賴 WebGL；Google Fonts 無法載入時會回退至系統字型。

## 檔案用途與驗證

| 檔案 | 用途 |
| --- | --- |
| `index.html`、`style.css` | 頁面與樣式 |
| `app.js` | 查詢、篩選、詳情與匯入介面 |
| `city.js`、`speech.js` | 立體城市、人物與雙人釋疑泡泡 |
| `data-model.js`、`excel-reader.js` | 分類、統計及 Excel 解析 |
| `data.json`、`resources.json` | 釋疑資料快照與文件入口 |
| `scripts/` | 本次資料與泡泡配置檢查 |
| `docs/SOURCE_NOTES.md` | 原專案來源與設計說明 |
| `BACKUP.json` | 備份時間、來源版本與範圍 |
| `SHA256SUMS` | 各檔案 SHA-256 校驗碼 |

若已安裝 Node.js，可執行 `npm run check`；不需先執行 `npm install`。
檢查腳本對應本次快照，未來更新資料後需同步調整預期統計。

此備份是來源版本的一次快照，未包含 Git 歷史、原託管環境設定、憑證或瀏覽器個人資料。
如要還原，解壓本包，重新依上線步驟部署；如要回復較早的 GitHub 版本，可使用儲存庫版本紀錄。
網站與工程資料之公開及第三方使用授權，仍由專案擁有者決定；本包未另授予開源授權。
