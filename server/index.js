// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { PDFDocument } = require("pdf-lib");
const AuditTrail = require("./models/AuditTrail");

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json({ limit: "10mb" })); // needed for base64 images

// ---------- MongoDB connection ----------
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/signature_engine";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ---------- Static for signed PDFs ----------
app.use("/signed", express.static(path.join(__dirname, "signed")));

// ---------- Helpers ----------
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// ---------- Routes ----------

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/**
 * POST /api/sign-pdf
 *
 * Body:
 * {
 *   pdfId: "sample",
 *   signatureBase64: "data:image/png;base64,..."
 *                    or "data:image/jpeg;base64,...",
 *   coordinates: {
 *     page: 1,
 *     xPct: 0.3,
 *     yPct: 0.3,
 *     widthPct: 0.2,
 *     heightPct: 0.1
 *   }
 * }
 */
app.post("/api/sign-pdf", async (req, res) => {
  try {
    const { pdfId, signatureBase64, coordinates } = req.body;

    if (!pdfId || !signatureBase64 || !coordinates) {
      return res
        .status(400)
        .json({ error: "Missing pdfId, signatureBase64 or coordinates" });
    }

    // For this prototype we only support one PDF
    if (pdfId !== "sample") {
      return res.status(404).json({ error: "Unknown pdfId" });
    }

    // 1. Load original PDF
    const pdfPath = path.join(__dirname, "pdfs", "sample.pdf");
    if (!fs.existsSync(pdfPath)) {
      return res.status(500).json({ error: "Source PDF not found on server" });
    }

    const originalPdfBytes = fs.readFileSync(pdfPath);

    // Hash BEFORE signing
    const originalHash = sha256(originalPdfBytes);

    const pdfDoc = await PDFDocument.load(originalPdfBytes);

    const pageIndex = (coordinates.page || 1) - 1;
    const page = pdfDoc.getPage(pageIndex);
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // 2. Decode base64 signature image (PNG or JPEG)
    const parts = signatureBase64.split(",");
    if (parts.length !== 2) {
      throw new Error("Invalid signature image data URL");
    }
    const base64Data = parts[1];

    const signatureBytes = Buffer.from(base64Data, "base64");

    // JPEG files start with 0xFF 0xD8 – detect by bytes
    const isJpeg =
      signatureBytes[0] === 0xff && signatureBytes[1] === 0xd8;

    let signatureImage;
    if (isJpeg) {
      signatureImage = await pdfDoc.embedJpg(signatureBytes);
    } else {
      // assume PNG otherwise
      signatureImage = await pdfDoc.embedPng(signatureBytes);
    }

    const sigDims = signatureImage.scale(1);

    // 3. Convert percentage coords -> PDF coordinates (points)
    const { xPct, yPct, widthPct, heightPct } = coordinates;

    const boxWidth = widthPct * pdfWidth;
    const boxHeight = heightPct * pdfHeight;

    const x = xPct * pdfWidth;

    // Browser: (0,0) at top-left
    // PDF:     (0,0) at bottom-left
    const yFromTop = yPct * pdfHeight;
    const y = pdfHeight - yFromTop - boxHeight;

    // 4. Aspect ratio constraint – fit inside box without stretching
    const scale = Math.min(
      boxWidth / sigDims.width,
      boxHeight / sigDims.height
    );

    const drawWidth = sigDims.width * scale;
    const drawHeight = sigDims.height * scale;

    // Center inside the box
    const drawX = x + (boxWidth - drawWidth) / 2;
    const drawY = y + (boxHeight - drawHeight) / 2;

    page.drawImage(signatureImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight
    });

    // 5. Save signed PDF to disk
    const signedPdfBytes = await pdfDoc.save();
    const fileName = `signed-${Date.now()}.pdf`;
    const signedPath = path.join(__dirname, "signed", fileName);

    fs.writeFileSync(signedPath, signedPdfBytes);

    // Hash AFTER signing
    const signedHash = sha256(signedPdfBytes);

    // Build public URL
    const baseUrl = process.env.BASE_URL || "http://localhost:5001";
    const relativePath = `/signed/${fileName}`;
    const url = `${baseUrl}${relativePath}`;

    // Basic IP capture
    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // 6. Save audit trail in Mongo
    await AuditTrail.create({
      pdfId,
      originalHash,
      signedHash,
      signedFilePath: relativePath,
      ipAddress
    });

    // 7. Respond to client
    return res.json({
      url,
      originalHash,
      signedHash
    });
  } catch (err) {
    console.error("Error in /api/sign-pdf:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
