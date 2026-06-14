# Healify — AI-Powered Digital Wellness Platform

> Built by **Team MediCode** | MSRIT Bangalore | AIML Interdisciplinary PBL

A unified AI-powered healthcare web platform combining Food Tracking, Emergency Care, and Medicine Management — all in one elegant interface.

---

## 🚀 Quick Start

### 1. Install Node.js
If you don't have Node.js, download it from [nodejs.org](https://nodejs.org/) (any version 16 or higher).

### 2. Install dependencies
Open terminal/command prompt in this folder and run:
```bash
npm install
```
This will take 1–2 minutes the first time.

### 3. Start the app
```bash
npm start
```
The website will automatically open at **http://localhost:3000**

---

## 📁 Project Structure

```
healify/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── ProfileModal.jsx
│   │   └── LoadingSpinner.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── FoodTracker.jsx
│   │   ├── EmergencyCare.jsx
│   │   └── MedicineManager.jsx
│   ├── context/
│   │   └── AppContext.jsx
│   ├── utils/
│   │   └── gemini.js
│   ├── App.jsx
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

---

## ✨ Features

### 🍱 Food Tracker
- Profile setup (weight, height, age, goal weight) → personalized daily targets
- Photo or text-based food entry with AI nutrition analysis
- "Correct Errors" button for AI misidentification
- Visual hydration tracker (8 glasses)
- Daily history of meals

### 🚨 Emergency Care
- Text or photo-based emergency input
- AI severity classification (Mild / Moderate / Critical)
- Step-by-step first-aid instructions
- Critical "Do NOT Do" warnings
- When-to-see-a-doctor guidance

### 💊 Medicine Manager
- Daily / Weekly / Monthly categorization
- Standard dosage grid (Morning-Afternoon-Evening-Night) — `1-0-0-0` format
- Last taken & Next dose timestamps
- Yes/No buttons with auto-miss tracking
- "Learn More" → AI-generated drug info, side effects, alternatives with prices

---

## 🔑 API Configuration

The Gemini API key is already configured in `src/utils/gemini.js`. To use your own key:
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Generate a new key
3. Replace `GEMINI_KEY` in `src/utils/gemini.js`

---

## 🎨 Tech Stack

- **Frontend**: React 18 + React Router
- **AI**: Google Gemini 2.5 Flash (Vision + Text)
- **Storage**: LocalStorage (browser persistence)
- **Icons**: Lucide React
- **Styling**: Custom CSS (no framework)

---

## 📝 Notes

- All data is saved in your browser's localStorage — clearing browser data resets the app
- For demo purposes, this runs without a backend
- For production, integrate a Node.js/Python backend with PostgreSQL

---

**Team MediCode** © 2026 — Healify is a student academic project.
