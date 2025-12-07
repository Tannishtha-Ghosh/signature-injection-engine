# Signature Injection Engine

This repository contains a prototype **Signature Injection Engine** built to reliably place signatures on PDFs while maintaining correct positioning across different screen sizes and devices.

The focus of this assignment is solving the coordinate mismatch between browsers and PDFs, preserving placement accuracy, and maintaining a verifiable audit trail.

---

## 🚀 Features

### Frontend
- PDF rendering using `react-pdf` (PDF.js)
- Drag and resize form fields on top of the PDF
  - Signature
  - Text
  - Image
  - Date
  - Radio
  - Checkbox
- Toolbox to add multiple fields
- Percentage-based positioning for responsive behavior
- Accurate placement retained when switching between desktop and mobile views
- Signature image upload (PNG and JPEG supported)

### Backend
- REST API using Node.js and Express
- Signature burned into the PDF using `pdf-lib`
- Accurate conversion from browser coordinates to PDF coordinates
- Aspect ratio preserved while embedding images
- Signed PDF served via a public URL

### Security & Audit Trail
- SHA-256 hash generated before signing
- SHA-256 hash generated after signing
- Audit records stored in MongoDB Atlas
- Includes timestamp and IP address for traceability

---

## 🧠 Core Problem & Solution

### The Problem
- Browsers use **CSS pixels** with origin at the **top-left**
- PDFs use **points (72 DPI)** with origin at the **bottom-left**
- Browser layouts are responsive; PDFs are static

### Frontend Coordinate Strategy

Field positions are stored as **percentages relative to the rendered PDF page**:

``` js
xPct = xPx / pageWidth
yPct = yPx / pageHeight
widthPct = boxWidthPx / pageWidth
heightPct = boxHeightPx / pageHeight
On re-render (desktop or mobile):

js
Copy code
xPx = xPct * pageWidth
yPx = yPct * pageHeight
This guarantees device-independent placement.

Backend Coordinate Conversion
PDF coordinates require Y-axis inversion:

js
Copy code
const boxWidth = widthPct * pdfWidth
const boxHeight = heightPct * pdfHeight

const x = xPct * pdfWidth
const yFromTop = yPct * pdfHeight
const y = pdfHeight - yFromTop - boxHeight
Aspect Ratio Handling
To prevent distortion, the signature image is scaled using:

js
Copy code
const scale = Math.min(
  boxWidth / imageWidth,
  boxHeight / imageHeight
)
The image is then centered within the bounding box.

🛠 Tech Stack
Frontend
React

Vite

react-pdf

react-rnd

Axios

Backend
Node.js

Express

pdf-lib

MongoDB Atlas

Mongoose

Crypto (SHA-256)

🧪 Running Locally
Prerequisites
Node.js (v20+)

MongoDB Atlas or local MongoDB

Backend Setup
bash
Copy code
cd server
npm install
Create a .env file:

env
Copy code
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/signature_engine
BASE_URL=http://localhost:5001
Ensure the source PDF exists at:

bash
Copy code
server/pdfs/sample.pdf
Run the backend:

bash
Copy code
node index.js
You should see:

text
Copy code
✅ MongoDB connected
Server running on port 5001
Frontend Setup
bash
Copy code
cd client
npm install
npm run dev
Open:

arduino
Copy code
http://localhost:5173
✅ Demo Flow
Open the PDF in the editor

Add and position the Signature field

Resize and anchor it to content

Switch between desktop and mobile views

Upload a signature image

Click Sign PDF

Open the signed PDF

Verify audit entry in MongoDB

📦 API Contract
POST /api/sign-pdf
Request body:

json
Copy code
{
  "pdfId": "sample",
  "signatureBase64": "data:image/png;base64,...",
  "coordinates": {
    "page": 1,
    "xPct": 0.3,
    "yPct": 0.3,
    "widthPct": 0.2,
    "heightPct": 0.1
  }
}
Response:

json
Copy code
{
  "url": "http://localhost:5001/signed/signed-123.pdf",
  "originalHash": "...",
  "signedHash": "..."
}
✅ Assumptions
Prototype supports single-page PDFs

Only signature fields are burned into the PDF

Other fields are visual/demo-only

Authentication is out of scope

📹 Video Walkthrough
A short Loom video demonstrates:

Responsive placement behavior

Coordinate conversion logic

PDF burn-in process

Audit trail creation

✅ Final Notes
This implementation prioritizes correctness and clarity over complexity.
The core challenge of mapping responsive browser interactions to static PDF coordinates is fully addressed.

yaml
Copy code

---

### ✅ After pasting
```bash
git add README.md
git commit -m "Add README."
git push

```

🌐 Live Deployment
🔹 Frontend (Vercel)

The frontend of the Signature Injection Engine is deployed on Vercel.

Live URL:

[https://your-frontend-name.vercel.app](https://signature-injection-engine.vercel.app/)

🔹 Backend (Render)

The backend API is deployed on Render.

Base API URL:

[https://your-backend-name.onrender.com](https://signature-injection-engine.onrender.com)


✅ The frontend communicates with the backend using the BASE_URL specified above.

🔧 Environment Variables (Production)
Frontend (Vercel)

Set the following environment variable in Vercel → Project Settings → Environment Variables:

VITE_BASE_URL=https://your-backend-name.onrender.com

Backend (Render)

Set the following environment variables in Render → Environment:

PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/signature_engine
BASE_URL=https://your-backend-name.onrender.com

🔗 API Example (Production)
POST https://your-backend-name.onrender.com/api/sign-pdf


Response:

{
  "url": "https://your-backend-name.onrender.com/signed/signed-123.pdf",
  "originalHash": "...",
  "signedHash": "..."
}

✅ Deployment Notes

Frontend is hosted on Vercel for fast global delivery

Backend is hosted on Render with persistent API access

MongoDB Atlas is used for audit trail storage

Signed PDFs are served via a public backend URL

✅ Final Git Commands
git add README.md
git commit -m "Add deployment links and production setup to README"
git push




