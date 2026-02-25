"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface AttachToContactProps {
  /** Function that generates a Blob (PDF or XLSX) to upload */
  generateFile: (format: "pdf" | "xlsx") => Blob;
  /** Title for the report (shown in the GHL note) */
  reportTitle: string;
}

type Mode = "attach" | "email";

export default function AttachToContact({ generateFile, reportTitle }: AttachToContactProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("attach");
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Email-specific state
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setContacts([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced contact search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setContacts([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/ghl/contacts/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setContacts(data.contacts || []);
      } catch {
        setContacts([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setQuery(contact.name);
    setContacts([]);
    // Auto-fill email fields when a contact is selected
    if (contact.email) setEmailTo(contact.email);
    if (contact.name) setEmailName(contact.name);
  };

  const resetPanel = () => {
    setIsOpen(false);
    setResult(null);
    setSelectedContact(null);
    setQuery("");
    setEmailTo("");
    setEmailName("");
    setEmailMessage("");
  };

  const handleAttach = useCallback(async () => {
    if (!selectedContact) return;

    setUploading(true);
    setResult(null);

    try {
      const blob = generateFile(format);
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const file = new File([blob], `${reportTitle.replace(/\s+/g, "_")}.${ext}`, {
        type: mimeType,
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("contactId", selectedContact.id);
      formData.append("contactName", selectedContact.name);
      formData.append("reportTitle", reportTitle);

      const res = await fetch("/api/ghl/contacts/attach-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult({ success: true, message: `Attached to ${selectedContact.name}` });
        setTimeout(resetPanel, 2000);
      } else {
        setResult({ success: false, message: data.error || "Failed to attach" });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Upload failed" });
    } finally {
      setUploading(false);
    }
  }, [selectedContact, format, generateFile, reportTitle]);

  const handleEmail = useCallback(async () => {
    if (!emailTo) return;

    setUploading(true);
    setResult(null);

    try {
      const blob = generateFile(format);
      const ext = format === "pdf" ? "pdf" : "xlsx";
      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const file = new File([blob], `${reportTitle.replace(/\s+/g, "_")}.${ext}`, {
        type: mimeType,
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("toEmail", emailTo);
      formData.append("toName", emailName);
      formData.append("reportTitle", reportTitle);
      if (emailMessage.trim()) {
        formData.append("message", emailMessage.trim());
      }

      const res = await fetch("/api/email/send-report", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult({ success: true, message: `Report emailed to ${emailTo}` });
        setTimeout(resetPanel, 2500);
      } else {
        setResult({ success: false, message: data.error || "Failed to send email" });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Email failed" });
    } finally {
      setUploading(false);
    }
  }, [emailTo, emailName, emailMessage, format, generateFile, reportTitle]);

  if (!isOpen) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => { setIsOpen(true); setMode("attach"); }}
          style={{
            padding: "12px 20px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            flex: 1,
          }}
        >
          Attach to Contact
        </button>
        <button
          onClick={() => { setIsOpen(true); setMode("email"); }}
          style={{
            padding: "12px 20px",
            background: "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            flex: 1,
          }}
        >
          Email Report
        </button>
      </div>
    );
  }

  const isEmailMode = mode === "email";
  const accentColor = isEmailMode ? "#8b5cf6" : "#3b82f6";

  return (
    <div
      style={{
        padding: 20,
        background: "#fff",
        border: `2px solid ${accentColor}`,
        borderRadius: 12,
      }}
    >
      {/* Header with mode toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
          <button
            onClick={() => setMode("attach")}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: mode === "attach" ? "#3b82f6" : "transparent",
              color: mode === "attach" ? "#fff" : "#6b7280",
              cursor: "pointer",
            }}
          >
            Attach to GHL
          </button>
          <button
            onClick={() => setMode("email")}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: mode === "email" ? "#8b5cf6" : "transparent",
              color: mode === "email" ? "#fff" : "#6b7280",
              cursor: "pointer",
            }}
          >
            Email Report
          </button>
        </div>
        <button
          onClick={resetPanel}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}
        >
          &times;
        </button>
      </div>

      {/* Contact Search (shared between modes) */}
      <div ref={dropdownRef} style={{ position: "relative", marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>
          {isEmailMode ? "Search Contact (optional)" : "Search Contact"}
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedContact(null); }}
          placeholder="Type name, email, or phone..."
          style={{
            width: "100%",
            padding: "8px 12px",
            border: selectedContact ? `2px solid #10b981` : "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />
        {searching && (
          <div style={{ position: "absolute", right: 12, top: 30, fontSize: 12, color: "#6b7280" }}>
            Searching...
          </div>
        )}

        {/* Contact Results Dropdown */}
        {contacts.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 50,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectContact(c)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  background: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                {(c.email || c.phone) && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                    {[c.email, c.phone].filter(Boolean).join(" • ")}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Email-specific fields */}
      {isEmailMode && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>
              Recipient Email <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="client@example.com"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>
              Recipient Name
            </label>
            <input
              type="text"
              value={emailName}
              onChange={(e) => setEmailName(e.target.value)}
              placeholder="John Smith"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>
              Message (optional)
            </label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Here's the analysis we discussed..."
              rows={3}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
        </>
      )}

      {/* Format Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>
          File Format
        </label>
        <div style={{ display: "flex", gap: 0, background: "#f3f4f6", borderRadius: 6, overflow: "hidden" }}>
          <button
            onClick={() => setFormat("pdf")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              background: format === "pdf" ? accentColor : "transparent",
              color: format === "pdf" ? "#fff" : "#6b7280",
              cursor: "pointer",
            }}
          >
            PDF
          </button>
          <button
            onClick={() => setFormat("xlsx")}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              background: format === "xlsx" ? accentColor : "transparent",
              color: format === "xlsx" ? "#fff" : "#6b7280",
              cursor: "pointer",
            }}
          >
            Excel
          </button>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600,
            background: result.success ? "#ecfdf5" : "#fef2f2",
            color: result.success ? "#059669" : "#dc2626",
          }}
        >
          {result.message}
        </div>
      )}

      {/* Action Button */}
      {isEmailMode ? (
        <button
          onClick={handleEmail}
          disabled={!emailTo || uploading}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: emailTo && !uploading ? "#8b5cf6" : "#d1d5db",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            cursor: emailTo && !uploading ? "pointer" : "not-allowed",
          }}
        >
          {uploading
            ? "Sending..."
            : emailTo
              ? `Email ${format.toUpperCase()} to ${emailName || emailTo}`
              : "Enter an email address"}
        </button>
      ) : (
        <button
          onClick={handleAttach}
          disabled={!selectedContact || uploading}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: selectedContact && !uploading ? "#3b82f6" : "#d1d5db",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 14,
            cursor: selectedContact && !uploading ? "pointer" : "not-allowed",
          }}
        >
          {uploading
            ? "Uploading..."
            : selectedContact
              ? `Attach ${format.toUpperCase()} to ${selectedContact.name}`
              : "Select a contact first"}
        </button>
      )}
    </div>
  );
}
