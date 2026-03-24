# 🧪 0Fluff Beta 4: Technical Notes

This document explains the new systems introduced in v1.4.0-beta.4.

### 📁 Drag-and-Drop Folders
We have moved to a unique ID-based architecture. This allows you to drag link tiles directly into folders.
- **Status:** Logic is stable.
- **Known Issue:** When hovering over a folder tile, the "morph" effect (scaling/glow) causes the folder icon to temporarily disappear. 
- **Note:** This is purely a CSS/rendering glitch. Your folder and its contents are safe; the icon returns once the hover state ends. A fix is scheduled for Beta 5.

### ❄️ Crystal Ice Theme
This is our most advanced visual theme, utilizing heavy glassmorphism.
- **Performance Note:** Because it uses high-radius blurring, users on desktop may experience slight scrolling lag. 
- **Recommendation:** If performance is a priority, our "Dark" and "Light" themes are optimized for maximum speed.

### 📱 Mobile Usage
While Beta 4 is functional on mobile, drag-and-drop is currently optimized for mouse input. Touch-based organization is a known limitation we are addressing.
