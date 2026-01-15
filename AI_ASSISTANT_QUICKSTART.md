# 🚀 Quick Start Guide - AI Assistant

## ⚡ Setup (2 minutes)

### 1. Get Google AI API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key (starts with `AIzaSy...`)

### 2. Configure Backend

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env and paste your API key
nano .env
```

Add this line:
```bash
GEMINI_API_KEY=AIzaSy...your-actual-key-here
```

Save and exit (Ctrl+X, Y, Enter)

### 3. Install Dependencies (Already Done ✅)

```bash
# Dependencies were installed automatically:
# - google-generativeai==0.8.3
# - python-docx==1.1.2
# - Pillow==10.4.0
```

### 4. Start the App

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Test It!

1. Open http://localhost:5173
2. Upload a dataset (Preprocesamiento)
3. Go to AI Assistant (sidebar)
4. Ask: "What columns do I have?"

✅ The AI should mention your specific columns!

---

## 🎯 Quick Test Scenarios

### Test 1: Context-Aware Response
```
1. Load dataset with "age", "glucose", "sex" columns
2. Ask: "How to compare glucose by sex?"
3. ✅ AI mentions your actual columns
```

### Test 2: Image Analysis
```
1. Upload a scatter plot
2. Ask: "What does this show?"
3. ✅ AI analyzes the image
```

### Test 3: Document Processing
```
1. Upload a .docx with research questions
2. Ask: "What methods do I need?"
3. ✅ AI reads and responds to document
```

---

## 🔍 Verification

**Check AI Health:**
```bash
curl http://localhost:8000/api/v1/ai/health
```

**Expected:**
```json
{
  "configured": true,
  "model": "gemini-1.5-flash",
  "status": "ready"
}
```

**Check API Docs:**
Open: http://localhost:8000/docs

Look for **"AI Assistant"** section

---

## ❌ Troubleshooting

### "missing_api_key" Error

**Problem:** API key not configured

**Solution:**
```bash
cd backend
cat .env | grep GEMINI
# Should show: GEMINI_API_KEY=AIzaSy...

# If empty, edit:
nano .env
# Add key and save
```

### "Module not found" Error

**Problem:** Dependencies not installed

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install google-generativeai python-docx Pillow
```

### AI Doesn't See My Data

**Problem:** No session context

**Solution:**
1. Make sure you uploaded a file first
2. Check for blue banner: "Contexto activo"
3. If missing, reload the page and try again

---

## 📚 Features Summary

✅ **Session-Aware** - AI knows your data  
✅ **Multimodal** - Images, Word, Excel  
✅ **Educational** - Biostatistics tutor  
✅ **Safe** - Validates files, handles errors  
✅ **Fast** - Gemini Flash model  

---

## 🎉 You're Ready!

The AI Assistant is now fully operational. Try asking questions about your data, upload charts for analysis, or get statistical recommendations!
