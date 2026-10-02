# SETU – AI Unified Police Platform

**SETU** is an AI-powered police assistance and complaint management platform designed to improve communication between citizens and law enforcement agencies.

## 🚀 Features

* **Multilingual Support:** Supports Hindi and English for accessible communication.
* **AI-Based Suspect Identification:** Uses fuzzy matching to identify potential suspects across records with different name spellings.
* **Complaint Management:** Enables citizens to register complaints and track their status.
* **Location-Based Services:** Helps citizens find nearby police stations using an interactive map.
* **Police Dashboard:** Provides police officers with tools for suspect searches and complaint management.
* **Smart Search:** Uses AI and text-matching techniques to improve search accuracy.

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Python, FastAPI
* **Libraries:** RapidFuzz
* **AI Integration:** Groq API
* **Maps:** Leaflet.js, OpenStreetMap
* **Tools:** Git, GitHub, VS Code

## 📂 Project Structure

```text
SETU/
├── frontend/
│   ├── citizen.html
│   ├── officer.html
│   ├── css/
│   └── js/
├── backend/
│   ├── main.py
│   └── requirements.txt
└── README.md
```

*Note: Update the folder structure above to match your actual repository.*

## ⚙️ Installation and Setup

1. Clone the repository:

   ```bash
   git clone <your-repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd SETU
   ```

3. Install the required Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Configure the required API keys in your environment.

5. Start the backend server:

   ```bash
   uvicorn main:app --reload
   ```

6. Open the frontend in your browser or run it through the configured local server.

## 🎯 Objective

To build a smarter, more accessible, and efficient police assistance system by combining AI, multilingual communication, and location-based technology.

## 👥 Project

Developed as part of the **Smart India Hackathon (SIH)** project initiative.
