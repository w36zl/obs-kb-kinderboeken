# 🚀 Quick Start: Amazon Cover Images

## ✅ **It's Already Working!**

Amazon cover images are **automatically enabled** in version 1.3.0+. No setup required!

---

## ⚙️ **How to Configure (Optional)**

### **Step 1: Open Settings**
1. Open Obsidian
2. Go to **Settings** (gear icon)
3. Click **Community Plugins** in the sidebar
4. Find **KB Nederlandse Kinderboeken**
5. Click the settings icon ⚙️

### **Step 2: Choose Your Region**
1. Scroll down to **"Amazon Cover Settings"**
2. In the **"Amazon region"** dropdown, select:
   - **Netherlands** (recommended for Dutch books) 🇳🇱
   - Germany 🇩🇪
   - United Kingdom 🇬🇧
   - United States 🇺🇸
   - France 🇫🇷

3. Done! That's all you need to do.

---

## 🎯 **How It Works**

When you search for a book, the plugin tries **4 different sources** for covers:

```
1. Open Library (Dutch ISBN)
   ↓ (if no cover found)
2. Open Library (English ISBN)
   ↓ (if no cover found)
3. Google Books
   ↓ (if no cover found)
4. Amazon ← YOU ARE HERE!
   ↓ (if no cover found)
5. Shows placeholder book icon
```

---

## 💡 **Example**

**Book:** "Little People Big Dreams - Frida Kahlo" (Dutch edition)

**What happens:**
1. ❌ Open Library Dutch ISBN → No cover
2. ❌ Open Library English ISBN → No cover  
3. ❌ Google Books → No cover
4. ✅ **Amazon Netherlands** → **Cover found!** 🎉

---

## 📊 **Why Use Amazon?**

### **Best For:**
- ✅ **Dutch children's books**
- ✅ **New releases** (2020+)
- ✅ **Popular series** (Little People Big Dreams, Harry Potter, etc.)
- ✅ **International editions**

### **Coverage:**
| Book Type | Availability |
|-----------|-------------|
| New Dutch books (2020+) | ⭐⭐⭐⭐⭐ Excellent |
| Classic children's books | ⭐⭐⭐⭐ Very Good |
| Older books (pre-2000) | ⭐⭐⭐ Good |
| Rare/obscure books | ⭐⭐ Fair |

---

## 🔍 **Testing It Out**

Want to see Amazon in action?

1. **Search for a book**:
   - Use the command palette (Ctrl/Cmd + P)
   - Type: "KB: Search for book"
   - Search for: "Frida Kahlo" or "Anne Frank"

2. **Check the results**:
   - If you see a cover thumbnail → It worked!
   - If you see a book icon placeholder → No cover available from any source

3. **Check the console** (optional):
   - Open Developer Tools (Ctrl+Shift+I)
   - Go to Console tab
   - Search for a book
   - Look for: `[KB Plugin] Trying Amazon for ISBN: ...`
   - You'll see which source provided the cover

---

## ❓ **FAQ**

### **Q: Do I need an Amazon account?**
❌ **No!** The plugin uses Amazon's public image servers.

### **Q: Do I need an API key?**
❌ **No!** No registration or API keys required.

### **Q: Are there any costs?**
❌ **No!** Completely free, no limits.

### **Q: Which region should I choose?**
🇳🇱 **Netherlands** works best for Dutch books. But try others if covers aren't found!

### **Q: Can I disable Amazon?**
✅ Yes! Just set the region to an empty value (currently not in UI, but Amazon will simply be skipped if it fails).

### **Q: Will this slow down searches?**
❌ **No!** Amazon is only tried if other sources (Open Library, Google Books) fail first.

### **Q: Why am I still seeing placeholder icons?**
Some books simply don't have covers available on any platform. The plugin tries 4 sources before giving up!

---

## 🎉 **Summary**

- ✅ **Already enabled** in v1.3.0+
- ✅ **Zero setup** required
- ✅ **No API keys** needed
- ✅ **Free forever**
- ✅ **Better cover availability**

Just install the update via BRAT and enjoy more book covers! 📚🎨

---

## 🆘 **Need Help?**

- 📖 Full documentation: See **AMAZON_SETUP.md**
- 🐛 Report issues: https://github.com/w36zl/obs-kb-kinderboeken/issues
- 💬 Questions: Create a discussion on GitHub

**Happy reading!** 📚✨
