const mongoose = require("mongoose");

const auditTrailSchema = new mongoose.Schema(
{
    pdfId: { type: String, required: true },
    originalHash: { type: String, required: true },
    signedHash: { type: String, required: true },
    signedFilePath: { type: String, required: true },
    ipAddress: { type: String }
},
{
    timestamps: true
}
);

module.exports = mongoose.model("AuditTrail", auditTrailSchema);
