# SETU Police AI Platform — Enhanced UI

A polished SIH-style prototype for police complaint intake and intelligence workflows.

## What's improved
- Distinct, polished officer login with independent light/dark theme.
- English/Hindi language controls on login, officer portal and citizen portal.
- Responsive mobile/tablet/desktop layouts.
- Handwritten complaint image upload with browser OCR (Tesseract.js) that drafts editable text.
- Officer and citizen complaint intake.
- Expanded case categories including critical crimes such as murder, sexual assault, kidnapping, attempted murder and armed robbery, plus common theft/robbery/fraud categories.
- Automatic triage priority: Critical / High / Medium / Low.
- Complaint-only Meerut and Delhi map.
- Standard and User-friendly map styles.
- Area/category/FIR search on the map.
- Case dashboard with priority, city and category graphs.
- Case management with priority/status/search filters and deadline indicators.
- Readable Identity Resolution and NLP result cards instead of raw JSON.
- Speech-to-text with English/Hindi browser recognition.
- Improved SETU Assistant chatbot with workflow-aware answers.
- Print/save FIR-style intake document.

## Important prototype rule
The map displays only complaints stored in `data/complaints.json`. It does not claim to represent actual city crime statistics. Severity is a workflow triage label, not a legal finding.

## Run
```bash
npm install
npm start
```
Open `http://localhost:3000/`.

Demo officer credentials are stored in `data/officers.json` and are intended only for the prototype.

## Production work still required
- Secure authentication/session management.
- Real database and audit logging.
- Proper legal FIR integration and authorised police systems.
- Secure file storage and malware scanning for uploads.
- A production OCR/handwriting model for better handwritten Hindi/English accuracy.


## Enhanced v3 notes
- Officer complaint location is a city selector + area/landmark field with speech input; it is no longer a generic “incident area” dropdown.
- Handwriting upload/OCR has been removed from the citizen complaint flow.
- Identity Resolution shows the matched person and case history instead of raw police/transport/civil source blocks.
- Complaint NLP shows detected language and a Hindi translation only.
- Crime Map has Standard/User-friendly tiles, complaint-only severity zones, city/category filters, and a Full map view.

Set these environment variables on the machine/server running SETU:

```text
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_approved_twilio_number
```


## v5 functional fixes
- Added working officer complaint speech-to-text microphone using browser SpeechRecognition.
- Added functional English/Hindi portal switching for major Police Portal navigation, controls, labels and complaint-category options.
- Improved SETU Assistant size, readability, suggestions and workflow-aware responses.
- Fixed section navigation to scroll to the top of the selected content area.
- Fixed full-map positioning so it remains below the top navigation and does not overlap the navbar.
- Added safer map resize handling when opening the map view/full-map mode.

## v9 UI / complaint acknowledgement updates
- Citizen complaint acknowledgement now has View, Download, and Print actions.
- Police complaint/FIR acknowledgement now has View FIR, Download FIR, and Print actions.
- Existing Cases & FIR rows also provide View and Download actions.
- Incident Area/Location input was removed from both complaint forms as requested; location is handled internally by the prototype.
- Contact numbers are validated as exactly 10 digits in both portals and by the backend.



1. Copy `.env.example` to `.env`.
2. Create/configure a Twilio account and fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.
3. Run `npm install` and then `npm start`.

For a Twilio trial account, SMS delivery may be limited to verified destination numbers.

## Citizen nearest-police-station map
The Citizen Portal now has a **Nearest Police Station** map. It requests the user's browser location, calls the SETU backend, finds nearby police stations from OpenStreetMap/Overpass data, and displays the nearest stations with distances and map markers.
