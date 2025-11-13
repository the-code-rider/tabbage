
#  Tabbage — Smart Tab Grouping & Window Layout Automation

**Tabbage** is a Chrome extension that lets you create **profiles** containing customizable **groups of URLs**, then open each group in configurable layouts:

* **Vertical columns**
* **Horizontal rows**
* **2×2 grid (2-column grid)**

You can:

* Create unlimited **profiles** (e.g., *Workday*, *Deep Work*, *Reading Mode*).
* Organize each profile into **groups** (e.g., *Mail*, *Social*, *Research*).
* Assign each group its own **tab layout**.
* **Inline rename** profiles.
* **Open** or **close** a group’s windows with one click.
* Persist all settings via `chrome.storage.sync`.

Tabbage = “tab” + “cabbage” 🍃 → a cute name for a multi-layered tab manager.



https://github.com/user-attachments/assets/cef969be-4047-4709-ba9a-664e7d4b77dc



---

#  Installation (Developer Mode)

1. Download/clone the project folder.
2. Open Chrome and navigate to:

```
chrome://extensions
```

3. Enable **Developer Mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the Tabbage folder.

You’ll see the Tabbage icon appear in Chrome’s toolbar.

---

#  How to Use Tabbage

### ## 1. Open the Tabbage popup

Click the **Tabbage icon** in your Chrome toolbar.

---

## 2. Choose or create a Profile

Profiles help you create different “modes”, such as:

* **Workday**
* **Research**
* **Social & News**
* **Reading Mode**
* **Morning Routine**

You can:

* **Select** a profile from the dropdown
* **Create** a new profile (+ button)
* **Rename** a profile *inline* (click its name)
* **Delete** a profile (🗑 button)

---

## 3. Add Groups inside a Profile

Each profile can contain multiple groups.
Examples:

**Mail**

* Gmail
* Outlook

**Social**

* X
* Reddit

**Reading**

* Hacker News
* Substack

Use the **“+” Add Group** button.

---

## 4. Edit a Group

When you select a group:

* **Name** — The title of the group
* **Layout** — Vertical / Horizontal / Grid (2×2)
* **URLs** — One URL per line

Tabbage automatically adds `https://` for clean URLs.

---

## 5. Open a Group

Click:

```
Open (layout)
```

Depending on the group's layout:

* **Vertical** → opens each URL in its own column
* **Horizontal** → each URL gets a row
* **Grid (2×2)** → a 2-column grid (2×N if more than 4 URLs)

Windows automatically tile themselves based on your current screen and window size.

---

## 6. Close a Group’s Windows

Click:

* The **close icon (“×”)** next to a group in the sidebar
  **OR**
* The **Close group windows** button in the editor

Tabbage tracks which windows belong to which group and closes only those windows.

---

#  How Tabbage Works (Technical Overview)

Below is a breakdown of the architecture and the logic powering the extension.

---

##  File Structure

```
/icons
   icon16.png
   icon32.png
   icon48.png
   icon128.png

popup.html
popup.js
manifest.json
```

---

#  manifest.json — Registration & Permissions

Tabbage uses:

* `"storage"` — Save profiles/groups in `chrome.storage.sync`
* `"windows"` — Create and position windows
* `"tabs"` — Standard tab-level permission

Example:

```json
"permissions": ["storage", "tabs", "windows"]
```

`action.default_popup` points to `popup.html`.

---

#  popup.html — UI Layer

The popup consists of:

### 1. Profile Section

* Profile dropdown
* Inline profile name editor
* Add, rename, delete buttons

### 2. Group Sidebar

* List of groups
* Add Group button
* Mini buttons: Open + Close

### 3. Group Editor

* Group name
* Layout selector
* URL textbox
* Save / Open / Close buttons

The UI is built using **vanilla HTML + CSS** (no frameworks), ensuring small size and full MV3 compatibility.

---

#  popup.js — Application Logic

This is where all the functionality lives.

### ## Core Concepts:

The extension maintains:

```js
profiles = [
  {
    id: "...",
    name: "Workday",
    groups: [
      {
        id: "...",
        name: "Mail",
        layout: "vertical",
        urls: [ ... ],
        windowIds: [ ... ]
      }
    ]
  }
];
```

Stored in:

```
chrome.storage.sync
```

This allows syncing across Chrome browsers.

---

# 💾 Storage

All profiles, groups, URLs, and configuration are stored via:

```js
chrome.storage.sync.set({ verticalProfilesV2: profiles });
```

Data automatically syncs across devices when logged into Chrome.

---

#  Window Management

The core of Tabbage is **layout-based window creation**:

```js
chrome.windows.create({
  url,
  left, top,
  width, height
});
```

Three layouts are implemented:

### 1. Vertical Columns

```
| A | B | C |
```

Each window is positioned by:

```
left = baseLeft + index * colWidth
```

### 2. Horizontal Rows

```
-----
| A |
-----
| B |
-----
```

Each window is positioned by:

```
top = baseTop + index * rowHeight
```

### 3. Grid (2×2)

Works for 2, 3, 4, 5… URLs:

```
| A | B |
| C | D |
| E | F |
```

Grid calculation:

```js
const cols = 2;
const rows = Math.ceil(count / cols);
const colIndex = index % cols;
const rowIndex = Math.floor(index / cols);
```

---

#  Window Closing

Each group tracks its opened window IDs in:

```
group.windowIds = [...]
```

Closing is done via:

```js
chrome.windows.remove(winId);
```

Skipped if window already closed.

---

#  Inline Profile Rename

Clicking the profile name switches it into an input:

```js
profileNameDisplay.style.display = "none";
profileNameInput.style.display = "block";
```

Enter / blur → save
ESC → cancel

This is saved back to storage and the dropdown updates automatically.



---

# 📜 License

MIT License.

---


