# BigQuery Release Hub ⚡

A premium, interactive web application built with **Python Flask** and **Vanilla HTML, CSS, and JavaScript** that fetches, parses, filters, and tweets Google Cloud BigQuery release notes.

---

## ✨ Features

- **🚀 Live Feed Parsing**: Fetches the official Google Cloud BigQuery XML feed and splits large, date-grouped entries into individual, fine-grained updates.
- **⚡ Smart Caching**: Backend includes an in-memory cache with a 5-minute TTL to reduce latency and provide offline fallbacks if the Google Cloud feed server is unreachable.
- **🔍 Real-time Search & Filtering**: Instant client-side search across update descriptions, and category-specific sorting (Features, Announcements, Issues, Changes).
- **🎨 Glassmorphic Dark UI**: Premium, high-contrast dark interface featuring smooth transitions, glowing state tags, skeleton loaders, and responsive grid layouts.
- **🐦 Interactive Tweet Composer**: 
  - Click **Tweet** on any card to auto-generate a formatted message with details and a direct URL.
  - Multi-select cards to generate a bulleted list for a summary tweet.
  - Custom composer featuring an SVG circular progress character counter (with warning states for the 280-character limit) and X (Twitter) Web Intent sharing.
- **📡 Sync Status Badge**: Displays a live indicator mapping the current sync state (Synced, Syncing, or Sync Error) and the last refreshed time.

---

## 📁 Repository Structure

```text
├── app.py                  # Flask Web Server & API feed parser
├── requirements.txt        # Backend dependencies (Flask, BeautifulSoup4, requests)
├── .gitignore              # Ignores virtual environments & Python caches
├── templates/
│   └── index.html          # Semantic HTML5 layout, modals, and skeletons
└── static/
    ├── css/
    │   └── style.css       # Design tokens, neon glow styles, and CSS transitions
    └── js/
        └── app.js          # Client-side filtering, checkbox sets, and tweet composers
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3.10+ installed.

### 1. Installation
Clone the repository and install the backend dependencies inside a virtual environment:

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Application
Start the Flask development server:

```bash
python app.py
```

### 3. Open the Application
Navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser to explore the dashboard.
