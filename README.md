# 🔍 AEO Diagnostic — AI Engine Optimization Report Card

> **How does AI recommend your product?** Query GPT, Claude, and Gemini simultaneously to see how AI shopping assistants rank your brand vs competitors.

![AEO Diagnostic](https://img.shields.io/badge/APIs-OpenAI%20%7C%20Anthropic%20%7C%20Google%20Gemini-purple)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🎯 What It Does

AEO (AI Engine Optimization) is the new SEO. As AI shopping assistants like ChatGPT, Claude, and Gemini increasingly influence purchase decisions, brands need to know **how these models recommend their products**.

**AEO Diagnostic** lets you:
1. Enter any shopping query (e.g., *"best magnesium supplement for seniors"*)
2. Optionally enter your brand name
3. Get an instant **report card** showing:
   - Your brand's **AEO Grade** (A+ to F)
   - **Brand visibility rankings** across all 3 AI models
   - **Position analysis** — where each brand appears in each AI's recommendations
   - **Strengths & weaknesses** of your brand's AI visibility
   - **Actionable optimization recommendations**
   - **Category intelligence** — what AI models prioritize in your market

## 🛠️ APIs & Tools Used

| Tool | Purpose |
|------|---------|
| **OpenAI API** (GPT-4o Mini) | AI shopping query + structured analysis extraction |
| **Anthropic API** (Claude 3.5 Haiku) | AI shopping query |
| **Google Gemini API** (Gemini 2.0 Flash) | AI shopping query |
| **Express.js** | Backend server |
| **Vanilla JS/CSS** | Premium dark-themed frontend |

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/pixii-aeo-diagnostic.git
cd pixii-aeo-diagnostic
npm install
```

### 2. Add API Keys

**Option A:** Create a `.env` file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

**Option B:** Enter keys in the app's Settings panel (stored in browser localStorage only).

### 3. Run

```bash
npm start
# → http://localhost:3000
```

### 4. Try the Demo

Click **"Try Demo"** to see a pre-generated report for *"best magnesium supplement for seniors"* — no API keys needed!

## 📸 Features

- **3 AI Models Queried Simultaneously** — parallel requests to GPT, Claude, and Gemini
- **Structured Brand Extraction** — AI-powered analysis identifies every brand mentioned
- **AEO Scoring System** — composite score based on visibility, position, and recommendation strength
- **Beautiful Report Card** — animated score ring, color-coded position badges, visibility bars
- **Actionable Recommendations** — specific steps to improve your AI visibility
- **Demo Mode** — works out of the box with realistic sample data
- **Privacy-First** — API keys stay in your browser, never stored on server

## 🏗️ Architecture

```
Client (Vanilla JS)
  │
  ├─ POST /api/diagnose
  │    │
  │    ├─ queryOpenAI()    → GPT-4o Mini
  │    ├─ queryAnthropic() → Claude 3.5 Haiku
  │    ├─ queryGemini()    → Gemini 2.0 Flash
  │    │
  │    └─ analyzeWithAI()  → Structured brand extraction (JSON mode)
  │
  └─ GET /api/demo → Pre-generated sample data
```

## 🔮 If I Had More Time

- **Scheduled monitoring** — track AEO scores over time, alert on ranking changes
- **Direct Amazon ASIN integration** — paste your listing URL, auto-extract brand & category
- **PDF export** — downloadable report cards for stakeholders
- **Competitor deep-dive** — detailed per-brand analysis with content recommendations
- **Multi-query batching** — test 10+ queries at once across product variations
- **Rufus integration** — include Amazon's AI assistant in the diagnostic
- **Historical trends** — chart your AEO score improvement over weeks/months

## 📄 License

MIT — Built for the Pixii.ai Founding Engineer challenge.
