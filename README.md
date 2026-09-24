# 【日程管理】HTML 互動看板 (Schedule Board)

極簡暖色調設計、支援時間軸網格拖曳排期、響應式佈局以及 Google Sheets / Apps Script (GAS) 雲端串接的【日程管理】互動看板。

---

## 🎨 視覺與色系規範 (Design & Color Palette)

- **主要背景與留白 (Background)**: ASH EGGSHELL (`#DACABF`)
- **主要文字與邊界 (Text & Borders)**: SPECKLED SLATE (`#4A3934`)
- **任務卡片分類色 (Accents & Categories)**:
  - 🔴 **PUMPKIN** (`#98341F`)：高優先級 / 緊急任務
  - 🟠 **YOLK** (`#E19956`)：中優先級 / 一般計畫
  - 🟡 **CEFRADINE** (`#D3A878`)：低優先級 / 選題與備註

---

## ✨ 核心功能特色

1. **時間軸網格與拖曳排期 (Grid & Drag-and-Drop)**
   - 橫向日期時間軸 + 垂直 Y 軸任務/專案分類列表。
   - 原生 HTML5 膠囊卡片橫向拖曳，放開即更新排期並即時同步。
   - 點擊左下角「+ 增加項目」按鈕隨時新增 Y 軸專案類別。

2. **台灣國定假日與週末自動標記**
   - 串接開源台灣辦公日曆 API (`ruyut/TaiwanCalendar`) 自動標示國定假日與名稱。
   - 週末與假日套用溫和色調識別。

3. **雙重資料架構 (GAS + LocalStorage)**
   - 未設定雲端連線時，自動以 `LocalStorage` 進行本地零延遲儲存。
   - 支援填入 **Google Apps Script (GAS) Web App URL**，資料自動雙向同步至 Google 試算表。

4. **資料備份、導入與導出**
   - **備份 / 導出**：一鍵匯出完整的 JSON 備份檔與 CSV 報表。
   - **導入**：支援 JSON 備份檔、CSV 表格，以及第三方行事曆 `.ics` (iCalendar) 檔案解析與載入。

5. **全響應式與行動裝置優化 (RWD)**
   - 電腦版：佔比 1/5 側邊欄與 4/5 主要網格。
   - 手機版：自動折疊為隱藏式「漢堡選單 Drawer」，支援觸控選擇時間欄位彈出 Modal 建立任務。

---

## 🚀 Google 試算表雲端同步部署指南 (每位使用者獨立設定)

本系統支援使用者自行綁定個人的 Google 試算表，**完全無需公開任何私密 ID**，連線網址僅保存在各使用者個人的瀏覽器 `LocalStorage` 中。

### 操作步驟：
1. **取得試算表**：點擊 [建立 Schedule_Board_Tasks 試算表副本](https://docs.google.com/spreadsheets/d/16L4q0AN9EOTTtg1G0lne0gNbpkJjiJLOTJLFrqkENUo/copy) 複製一份專屬試算表到您的 Google Drive。
2. **打開 Apps Script**：在您的試算表點選「**擴充功能**」➔「**Apps Script**」。
3. **貼上代碼**：清空原有代碼，將專案內的 `Code.gs`（或看板設定彈窗中的「一鍵複製」）完整貼入並儲存。
4. **發布 Web 應用程式**：
   - 點擊右上角「**部署**」➔「**新增部署**」。
   - 種類選「**Web 應用程式**」。
   - 執行身分選「**我 (Me)**」。
   - 存取權限切換為「**任何人 (Anyone)**」*(重要：若未設為任何人，瀏覽器將無法連線)*。
5. **綁定網址**：複製獲得的 Web App URL，回到看板左下方點擊「**後端資料庫**」，貼上並點「**儲存設定**」即可！隨時可點「解除連線」切換回純離線模式。

---

## 📄 License
MIT License。歡迎免費使用與補充。
