import "./App.css";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Rnd } from "react-rnd";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";


// PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Simple ID helper
const makeId = () => Math.random().toString(36).slice(2, 9);

function App() {
  // --- PDF page size ---
  const [pageSize, setPageSize] = useState({ width: null, height: null });

  // --- All fields on the PDF (multiple types) ---
  const [fields, setFields] = useState([
    {
      id: makeId(),
      type: "signature", // initial field
      xPct: 0.3,
      yPct: 0.3,
      widthPct: 0.2,
      heightPct: 0.1
    }
  ]);

  // --- Signature image + backend state ---
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hashes, setHashes] = useState(null);

  // Colors per field type (for Rnd box)
  const FIELD_COLORS = {
    signature: "#ef4444",
    text: "#3b82f6",
    image: "#a855f7",
    date: "#f59e0b",
    radio: "#22c55e",
    checkbox: "#22c55e"
  };

  const FIELD_LABELS = {
    signature: "Signature",
    text: "Text",
    image: "Image",
    date: "Date",
    radio: "Radio",
    checkbox: "Checkbox"
  };

  // ---------- PDF handlers ----------

  const handlePageRender = (page) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageSize({ width: viewport.width, height: viewport.height });
    console.log("PDF page size (px):", viewport.width, viewport.height);
  };

  // ---------- Field creation (toolbox) ----------

  const handleAddField = (type) => {
    if (!pageSize.width || !pageSize.height) {
      alert("Wait for the PDF to load before adding fields.");
      return;
    }

    setFields((prev) => [
      ...prev,
      {
        id: makeId(),
        type,
        // drop near top-left by default
        xPct: 0.1,
        yPct: 0.1,
        widthPct: type === "signature" ? 0.25 : 0.18,
        heightPct: type === "signature" ? 0.08 : 0.06
      }
    ]);
  };

  // ---------- Drag / Resize handlers per field ----------

  const updateField = (id, updater) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updater(f) } : f))
    );
  };

  const handleDragStop = (id, d) => {
    if (!pageSize.width || !pageSize.height) return;

    const xPct = d.x / pageSize.width;
    const yPct = d.y / pageSize.height;

    updateField(id, () => ({ xPct, yPct }));
  };

  const handleResizeStop = (id, ref, position) => {
    if (!pageSize.width || !pageSize.height) return;

    const newWidthPct = ref.offsetWidth / pageSize.width;
    const newHeightPct = ref.offsetHeight / pageSize.height;
    const xPct = position.x / pageSize.width;
    const yPct = position.y / pageSize.height;

    updateField(id, () => ({
      xPct,
      yPct,
      widthPct: newWidthPct,
      heightPct: newHeightPct
    }));
  };

  // ---------- Signature upload ----------

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureDataUrl(reader.result); // data:image/...;base64,...
    };
    reader.readAsDataURL(file);
  };

  // ---------- Sign button: call backend ----------

  const handleSignClick = async () => {
    if (!signatureDataUrl) {
      alert("Please upload a signature image first.");
      return;
    }
    if (!pageSize.width || !pageSize.height) {
      alert("PDF is not ready yet.");
      return;
    }

    const signatureField = fields.find((f) => f.type === "signature");
    if (!signatureField) {
      alert("Please add at least one Signature field.");
      return;
    }

    try {
      setLoading(true);
      setSignedUrl(null);
      setHashes(null);

      const payload = {
        pdfId: "sample", // hardcoded for prototype
        signatureBase64: signatureDataUrl,
        coordinates: {
          page: 1,
          xPct: signatureField.xPct,
          yPct: signatureField.yPct,
          widthPct: signatureField.widthPct,
          heightPct: signatureField.heightPct
        }
      };

      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

const res = await axios.post(`${API_BASE}/api/sign-pdf`, payload);

      setSignedUrl(res.data.url);
      setHashes({
        originalHash: res.data.originalHash,
        signedHash: res.data.signedHash
      });
    } catch (err) {
      console.error(err);
      alert("Error signing PDF (check console)");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Render ----------

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Signature Injection Engine</h1>
        <p>Prototype for PDF signature placement</p>
      </header>

      <main className="app-main">
        {/* LEFT: PDF + all fields */}
        <section className="pdf-section">
          <h2>PDF Viewer</h2>

          <div className="pdf-wrapper">
            <Document
              file="/sample.pdf"
              onLoadError={(err) => {
                console.error("Error loading PDF:", err);
              }}
              onLoadSuccess={({ numPages }) => {
                console.log("PDF loaded, pages:", numPages);
              }}
            >
              <Page
                pageNumber={1}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onRenderSuccess={handlePageRender}
              />
            </Document>

            {pageSize.width && pageSize.height && (
              <div
                className="pdf-overlay"
                style={{
                  width: pageSize.width,
                  height: pageSize.height
                }}
              >
                {fields.map((field) => {
                  const color = FIELD_COLORS[field.type] || "#e5e7eb";
                  const label = FIELD_LABELS[field.type] || field.type;

                  return (
                    <Rnd
                      key={field.id}
                      bounds="parent"
                      size={{
                        width: field.widthPct * pageSize.width,
                        height: field.heightPct * pageSize.height
                      }}
                      position={{
                        x: field.xPct * pageSize.width,
                        y: field.yPct * pageSize.height
                      }}
                      onDragStop={(e, d) => handleDragStop(field.id, d)}
                      onResizeStop={(e, dir, ref, delta, pos) =>
                        handleResizeStop(field.id, ref, pos)
                      }
                      style={{
                        border: `2px dashed ${color}`,
                        background: "rgba(15,23,42,0.9)",
                        boxShadow: "0 0 0 1px rgba(15,23,42,0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          padding: 4,
                          color,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em"
                        }}
                      >
                        {label}
                      </div>
                    </Rnd>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Toolbox + controls */}
        <aside className="controls-section">
          <h2>Controls</h2>

          {/* Toolbox */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, marginBottom: 6 }}>Add field:</p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 4
              }}
            >
              {["signature", "text", "image", "date", "radio", "checkbox"].map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddField(type)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.4)",
                      background: "rgba(15,23,42,0.9)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                      color: FIELD_COLORS[type],
                      boxShadow: "0 0 0 1px rgba(15,23,42,0.7)"
                    }}
                  >
                    {FIELD_LABELS[type]}
                  </button>
                )
              )}
            </div>
            <small>Drag & resize fields directly on the PDF.</small>
          </div>

          {/* Signature upload */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4 }}>
              Signature Image (PNG/JPEG):
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleSignatureUpload}
            />
            {signatureDataUrl && (
              <p style={{ fontSize: 12, marginTop: 4 }}>
                Signature image loaded ✅
              </p>
            )}
          </div>

          {/* Field debug */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ marginBottom: 4, fontSize: 13 }}>
              Fields (relative to PDF page):
            </p>
            <pre
              style={{
                fontSize: 11,
                background: "#0b1120",
                padding: 8,
                maxHeight: 140,
                overflow: "auto"
              }}
            >
              {JSON.stringify(fields, null, 2)}
            </pre>
          </div>

          {/* Sign button */}
          <button onClick={handleSignClick} disabled={loading}>
            {loading ? "Signing..." : "Sign PDF"}
          </button>

          {/* Signed URL */}
          {signedUrl && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13 }}>Signed PDF:</p>
              <a href={signedUrl} target="_blank" rel="noreferrer">
                Open signed document
              </a>
            </div>
          )}

          {/* Hashes */}
          {hashes && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, marginBottom: 4 }}>Audit (SHA-256):</p>
              <pre
                style={{
                  fontSize: 11,
                  background: "#0b1120",
                  padding: 8,
                  maxHeight: 160,
                  overflow: "auto"
                }}
              >
                {JSON.stringify(hashes, null, 2)}
              </pre>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
