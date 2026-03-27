"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AddFollowUpButton from "../../components/add-followup-button";

interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  source?: string;
  dateAdded?: string;
  customFields?: Array<{ key: string; value: string }> | Record<string, string>;
}

interface Note {
  id: string;
  body: string;
  dateAdded?: string;
}

interface Message {
  id: string;
  body?: string;
  type?: string;
  direction?: string;
  dateAdded?: string;
  status?: string;
}

interface Conversation {
  id: string;
  type?: string;
  dateAdded?: string;
  lastMessageDate?: string;
  messages: Message[];
}

interface TimelineEvent {
  id: string;
  type: "email" | "sms" | "call" | "note" | "other";
  direction: "inbound" | "outbound" | "internal";
  body: string;
  subject?: string;
  timestamp: string;
  channel: string;
  status?: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  subject?: string;
  body: string;
  channels: string[];
  isDefault?: boolean;
}

export default function ContactDetailClient({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "timeline" | "compose" | "property" | "booking">(
    "details",
  );

  // Note creation state
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Compose state
  const [composeType, setComposeType] = useState<"email" | "sms">("email");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Timeline
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Booking state
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00");
  const [bookingDuration, setBookingDuration] = useState("60");
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ATTOM property enrichment state
  const [propertyData, setPropertyData] = useState<Record<string, any> | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertyError, setPropertyError] = useState("");
  const [propertySearched, setPropertySearched] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    async function fetchContact() {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/ghl/contact-detail?contactId=${contactId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch contact");
        }
        const data = await res.json();
        setContact(data.contact);
        setNotes(data.notes || []);
        setConversations(data.conversations || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load contact");
      } finally {
        setIsLoading(false);
      }
    }
    fetchContact();
  }, [contactId]);

  // Load templates on mount
  useEffect(() => {
    fetch("/api/messaging/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {});
  }, []);

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/messaging/conversations?contactId=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } catch {
    } finally {
      setTimelineLoading(false);
    }
  }, [contactId]);

  // Load timeline when tab switches
  useEffect(() => {
    if (activeTab === "timeline" && timeline.length === 0 && !timelineLoading) {
      loadTimeline();
    }
  }, [activeTab, timeline.length, timelineLoading, loadTimeline]);

  const getDisplayName = (c: Contact): string => {
    if (c.name) return c.name;
    if (c.firstName || c.lastName) return `${c.firstName || ""} ${c.lastName || ""}`.trim();
    return c.email || c.phone || "Unknown";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const applyTemplate = (template: Template) => {
    const name = contact ? getDisplayName(contact) : "there";
    let body = template.body.replace(/\{\{name\}\}/g, name).replace(/\{\{property\}\}/g, "the property");
    setComposeMessage(body);
    if (template.subject) {
      setComposeSubject(template.subject);
    }
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if (!composeMessage.trim()) return;
    setIsSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          type: composeType,
          message: composeMessage.trim(),
          subject: composeType === "email" ? composeSubject.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ type: "success", message: `${composeType === "email" ? "Email" : "SMS"} sent successfully!` });
        setComposeMessage("");
        setComposeSubject("");
        showToast(`${composeType === "email" ? "Email" : "SMS"} sent!`, "success");
      } else {
        setSendResult({ type: "error", message: data.error || "Failed to send" });
      }
    } catch {
      setSendResult({ type: "error", message: "Network error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!bookingTitle.trim() || !bookingDate) return;
    setIsBooking(true);
    setBookingResult(null);
    try {
      const startAt = new Date(`${bookingDate}T${bookingTime}`);
      const endAt = new Date(startAt.getTime() + parseInt(bookingDuration) * 60 * 1000);
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          contactName: contact ? getDisplayName(contact) : undefined,
          contactEmail: contact?.email,
          contactPhone: contact?.phone,
          title: bookingTitle.trim(),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          location: bookingLocation || undefined,
          notes: bookingNotes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookingResult({ type: "success", message: data.message || "Appointment booked!" });
        setBookingTitle("");
        setBookingDate("");
        setBookingNotes("");
        setBookingLocation("");
        showToast("Appointment booked!", "success");
      } else {
        setBookingResult({ type: "error", message: data.error || "Failed to book" });
      }
    } catch {
      setBookingResult({ type: "error", message: "Network error" });
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading contact details...</div>;
  }

  if (error) {
    return (
      <div>
        <Link
          href="/app/contacts"
          style={{ color: "#3b82f6", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
        >
          &larr; Back to Contacts
        </Link>
        <div style={{ padding: 16, background: "#fee2e2", color: "#dc2626", borderRadius: 8 }}>{error}</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div>
        <Link
          href="/app/contacts"
          style={{ color: "#3b82f6", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
        >
          &larr; Back to Contacts
        </Link>
        <div style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
          Contact not found.
        </div>
      </div>
    );
  }

  const location = [contact.address1, contact.city, contact.state, contact.postalCode, contact.country]
    .filter(Boolean)
    .join(", ");

  const hasAddress = !!(contact.address1 && (contact.city || contact.postalCode));

  const lookupProperty = async () => {
    if (!contact.address1) return;
    setPropertyLoading(true);
    setPropertyError("");
    try {
      const addrParts = [contact.address1, contact.city, contact.state, contact.postalCode].filter(Boolean);
      const params = new URLSearchParams();
      params.set("endpoint", "expanded");
      params.set("address", addrParts.join(", "));
      const res = await fetch(`/api/integrations/attom/property?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Property lookup failed");
      const prop = data.property?.[0];
      if (!prop) throw new Error("No property found at this address");
      setPropertyData(prop);
      setPropertySearched(true);
    } catch (err: unknown) {
      setPropertyError(err instanceof Error ? err.message : "Lookup failed");
      setPropertySearched(true);
    } finally {
      setPropertyLoading(false);
    }
  };

  const tabs: { key: typeof activeTab; label: string; count?: number }[] = [
    { key: "details", label: "Details" },
    { key: "compose", label: "Compose" },
    { key: "timeline", label: "Timeline" },
    { key: "notes", label: "Notes", count: notes.length },
    { key: "booking", label: "Book Appt" },
    { key: "property", label: "Property" },
  ];

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 100,
            padding: "12px 20px",
            borderRadius: 8,
            background: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
            border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#a7f3d0"}`,
            color: toast.type === "error" ? "#dc2626" : "#059669",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {toast.message}
        </div>
      )}

      <Link
        href="/app/contacts"
        style={{ color: "#3b82f6", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 16 }}
      >
        &larr; Back to Contacts
      </Link>

      {/* Header */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{getDisplayName(contact)}</h1>
            {contact.source && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Source: {contact.source}</div>
            )}
            {contact.dateAdded && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>Added: {formatDate(contact.dateAdded)}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {contact.email && (
              <button
                onClick={() => {
                  setActiveTab("compose");
                  setComposeType("email");
                }}
                style={{
                  padding: "8px 16px",
                  background: "#3b82f6",
                  color: "#fff",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Compose Email
              </button>
            )}
            {contact.phone && (
              <button
                onClick={() => {
                  setActiveTab("compose");
                  setComposeType("sms");
                }}
                style={{
                  padding: "8px 16px",
                  background: "#10b981",
                  color: "#fff",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Send SMS
              </button>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                style={{
                  padding: "8px 16px",
                  background: "#f59e0b",
                  color: "#fff",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Call
              </a>
            )}
            <button
              onClick={() => setActiveTab("booking")}
              style={{
                padding: "8px 16px",
                background: "#8b5cf6",
                color: "#fff",
                borderRadius: 6,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Book Appt
            </button>
            <AddFollowUpButton contactId={contactId} entityName={getDisplayName(contact)} />
          </div>
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {contact.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{ padding: "3px 10px", background: "#e0e7ff", color: "#3730a3", borderRadius: 12, fontSize: 12 }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", marginBottom: 20, overflowX: "auto" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
              marginBottom: -2,
              color: activeTab === tab.key ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  marginLeft: 6,
                  padding: "1px 7px",
                  background: activeTab === tab.key ? "#dbeafe" : "#f3f4f6",
                  borderRadius: 10,
                  fontSize: 11,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === "details" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            <InfoField label="First Name" value={contact.firstName} />
            <InfoField label="Last Name" value={contact.lastName} />
            <InfoField
              label="Email"
              value={contact.email}
              href={contact.email ? `mailto:${contact.email}` : undefined}
            />
            <InfoField label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
            {location && <InfoField label="Address" value={location} />}
            {contact.source && <InfoField label="Source" value={contact.source} />}
            {contact.dateAdded && <InfoField label="Date Added" value={formatDate(contact.dateAdded)} />}
          </div>
        </div>
      )}

      {/* Compose Tab — Email & SMS */}
      {activeTab === "compose" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
          {/* Channel Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => setComposeType("email")}
              disabled={!contact.email}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: contact.email ? "pointer" : "not-allowed",
                background: composeType === "email" ? "#3b82f6" : "#f3f4f6",
                color: composeType === "email" ? "#fff" : contact.email ? "#374151" : "#9ca3af",
              }}
            >
              Email{!contact.email && " (no email on file)"}
            </button>
            <button
              onClick={() => setComposeType("sms")}
              disabled={!contact.phone}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                fontSize: 14,
                cursor: contact.phone ? "pointer" : "not-allowed",
                background: composeType === "sms" ? "#10b981" : "#f3f4f6",
                color: composeType === "sms" ? "#fff" : contact.phone ? "#374151" : "#9ca3af",
              }}
            >
              SMS{!contact.phone && " (no phone on file)"}
            </button>
          </div>

          {/* Quick-Reply Templates */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: showTemplates ? "#f0f9ff" : "#fff",
                color: "#3b82f6",
                cursor: "pointer",
              }}
            >
              {showTemplates ? "Hide Templates" : "Use Template"}
            </button>
            {showTemplates && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {templates
                  .filter((t) => t.channels.includes(composeType))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      style={{
                        padding: "5px 12px",
                        fontSize: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        background: "#fff",
                        cursor: "pointer",
                        color: "#374151",
                      }}
                      title={t.body}
                    >
                      {t.name}
                    </button>
                  ))}
                {templates.filter((t) => t.channels.includes(composeType)).length === 0 && (
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>No templates for this channel</span>
                )}
              </div>
            )}
          </div>

          {/* Subject (email only) */}
          {composeType === "email" && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Subject
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Email subject..."
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          {/* Message Body */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Message{" "}
              {composeType === "sms" && <span style={{ fontWeight: 400 }}>({composeMessage.length}/300 chars)</span>}
            </label>
            <textarea
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              placeholder={composeType === "email" ? "Write your email..." : "Write your text message..."}
              rows={composeType === "email" ? 8 : 4}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Send Result */}
          {sendResult && (
            <div
              style={{
                padding: 10,
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 13,
                background: sendResult.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: sendResult.type === "success" ? "#059669" : "#dc2626",
              }}
            >
              {sendResult.message}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              onClick={() => {
                setComposeMessage("");
                setComposeSubject("");
                setSendResult(null);
              }}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              Clear
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !composeMessage.trim()}
              style={{
                padding: "8px 24px",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                borderRadius: 6,
                cursor: isSending ? "wait" : "pointer",
                background: composeType === "email" ? "#3b82f6" : "#10b981",
                color: "#fff",
                opacity: isSending || !composeMessage.trim() ? 0.6 : 1,
              }}
            >
              {isSending ? "Sending..." : `Send ${composeType === "email" ? "Email" : "SMS"}`}
            </button>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>Conversation Timeline</h3>
            <button
              onClick={loadTimeline}
              disabled={timelineLoading}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                color: "#3b82f6",
              }}
            >
              {timelineLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {timelineLoading && timeline.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading conversation timeline...</div>
          )}

          {!timelineLoading && timeline.length === 0 && (
            <div
              style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}
            >
              <div style={{ marginBottom: 8, fontWeight: 600 }}>No conversations yet</div>
              <div style={{ fontSize: 13 }}>Send an email or SMS to start a conversation with this contact.</div>
            </div>
          )}

          {timeline.length > 0 && (
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical timeline line */}
              <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "#e5e7eb" }} />

              {timeline.map((event) => {
                const isOutbound = event.direction === "outbound";
                const isNote = event.type === "note";
                const channelColors: Record<string, string> = {
                  email: "#3b82f6",
                  sms: "#10b981",
                  call: "#f59e0b",
                  note: "#8b5cf6",
                  other: "#6b7280",
                };
                const color = channelColors[event.type] || "#6b7280";

                return (
                  <div key={event.id} style={{ position: "relative", marginBottom: 16 }}>
                    {/* Timeline dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -20,
                        top: 4,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: color,
                        border: "2px solid #fff",
                        boxShadow: "0 0 0 2px #e5e7eb",
                      }}
                    />

                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 12,
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: `${color}15`,
                              color,
                            }}
                          >
                            {event.type}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: isOutbound ? "#3b82f6" : isNote ? "#8b5cf6" : "#059669",
                            }}
                          >
                            {isNote ? "Internal" : isOutbound ? "Sent" : "Received"}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatDate(event.timestamp)}</span>
                      </div>
                      {event.subject && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                          {event.subject}
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                        {event.body || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No content</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div>
          <div
            style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}
          >
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button
                onClick={async () => {
                  if (!newNote.trim()) return;
                  setIsAddingNote(true);
                  try {
                    const res = await fetch("/api/ghl/contacts/notes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ contactId, body: newNote.trim() }),
                    });
                    if (res.ok) {
                      setNotes((prev) => [
                        { id: `local-${Date.now()}`, body: newNote.trim(), dateAdded: new Date().toISOString() },
                        ...prev,
                      ]);
                      setNewNote("");
                      showToast("Note added", "success");
                    }
                  } catch {
                  } finally {
                    setIsAddingNote(false);
                  }
                }}
                disabled={isAddingNote || !newNote.trim()}
                style={{
                  padding: "8px 20px",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isAddingNote ? "wait" : "pointer",
                  opacity: isAddingNote || !newNote.trim() ? 0.6 : 1,
                }}
              >
                {isAddingNote ? "Saving..." : "Add Note"}
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div
              style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}
            >
              No notes for this contact yet. Add one above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}
                >
                  {note.dateAdded && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{formatDate(note.dateAdded)}</div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Tab */}
      {activeTab === "booking" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: "#111827" }}>
            Book Appointment with {getDisplayName(contact)}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Title
              </label>
              <input
                type="text"
                value={bookingTitle}
                onChange={(e) => setBookingTitle(e.target.value)}
                placeholder="e.g. Property Showing, Consultation"
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Location
              </label>
              <input
                type="text"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
                placeholder="e.g. 123 Main St or Zoom"
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Time
              </label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Duration
              </label>
              <select
                value={bookingDuration}
                onChange={(e) => setBookingDuration(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                  background: "#fff",
                }}
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
              Notes
            </label>
            <textarea
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              placeholder="Any notes for the appointment..."
              rows={3}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          {bookingResult && (
            <div
              style={{
                padding: 10,
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 13,
                background: bookingResult.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: bookingResult.type === "success" ? "#059669" : "#dc2626",
              }}
            >
              {bookingResult.message}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleBookAppointment}
              disabled={isBooking || !bookingTitle.trim() || !bookingDate}
              style={{
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                background: "#8b5cf6",
                color: "#fff",
                cursor: isBooking ? "wait" : "pointer",
                opacity: isBooking || !bookingTitle.trim() || !bookingDate ? 0.6 : 1,
              }}
            >
              {isBooking ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </div>
      )}

      {/* Property Tab */}
      {activeTab === "property" && (
        <div>
          {!hasAddress && !propertySearched && (
            <div
              style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}
            >
              <div style={{ marginBottom: 8, fontWeight: 600 }}>No address on file</div>
              <div style={{ fontSize: 13 }}>Add an address to this contact to look up their property data.</div>
            </div>
          )}

          {hasAddress && !propertySearched && !propertyLoading && (
            <div style={{ padding: 32, textAlign: "center", background: "#f9fafb", borderRadius: 12 }}>
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 4, fontWeight: 600 }}>
                Look up property data for this contact
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>{location}</div>
              <button
                onClick={lookupProperty}
                style={{
                  padding: "10px 24px",
                  background: "#3b82f6",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Look Up Property
              </button>
            </div>
          )}

          {propertyLoading && (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Looking up property data...</div>
          )}

          {propertyError && (
            <div
              style={{
                padding: 16,
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {propertyError}
              {hasAddress && (
                <button
                  onClick={lookupProperty}
                  style={{
                    marginLeft: 12,
                    padding: "4px 12px",
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 6,
                    border: "none",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {propertyData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {propertyData.avm?.amount?.value != null && (
                  <div style={{ padding: 16, background: "#ecfdf5", borderRadius: 10, textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#059669",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      AVM Value
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>
                      ${propertyData.avm.amount.value.toLocaleString()}
                    </div>
                    {propertyData.avm.amount.low != null && propertyData.avm.amount.high != null && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        ${propertyData.avm.amount.low.toLocaleString()} - $
                        {propertyData.avm.amount.high.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                {(propertyData.sale?.amount?.saleAmt || propertyData.sale?.amount?.salePrice) != null && (
                  <div style={{ padding: 16, background: "#eff6ff", borderRadius: 10, textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#3b82f6",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Last Sale
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>
                      ${(propertyData.sale.amount.saleAmt || propertyData.sale.amount.salePrice).toLocaleString()}
                    </div>
                    {propertyData.sale.amount.saleTransDate && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{propertyData.sale.amount.saleTransDate}</div>
                    )}
                  </div>
                )}
                {propertyData.assessment?.assessed?.assdTtlValue != null && (
                  <div style={{ padding: 16, background: "#f5f3ff", borderRadius: 10, textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#7c3aed",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Assessed Value
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed" }}>
                      ${propertyData.assessment.assessed.assdTtlValue.toLocaleString()}
                    </div>
                    {propertyData.assessment.tax?.taxAmt != null && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Tax: ${propertyData.assessment.tax.taxAmt.toLocaleString()}/yr
                      </div>
                    )}
                  </div>
                )}
                {propertyData.avm?.amount?.value != null &&
                  (propertyData.sale?.amount?.saleAmt || propertyData.sale?.amount?.salePrice) != null && (
                    <div style={{ padding: 16, background: "#fefce8", borderRadius: 10, textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#a16207",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Est. Equity
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#a16207" }}>
                        $
                        {(
                          propertyData.avm.amount.value -
                          (propertyData.sale.amount.saleAmt || propertyData.sale.amount.salePrice)
                        ).toLocaleString()}
                      </div>
                    </div>
                  )}
              </div>

              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>Property Details</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "8px 20px",
                  }}
                >
                  <PropertyField label="Address" value={propertyData.address?.oneLine} />
                  <PropertyField
                    label="Type"
                    value={propertyData.summary?.propertyType || propertyData.summary?.propType}
                  />
                  <PropertyField label="Beds" value={propertyData.building?.rooms?.beds} />
                  <PropertyField
                    label="Baths"
                    value={propertyData.building?.rooms?.bathsFull ?? propertyData.building?.rooms?.bathsTotal}
                  />
                  <PropertyField
                    label="Sqft"
                    value={
                      propertyData.building?.size?.livingSize || propertyData.building?.size?.universalSize
                        ? `${(propertyData.building.size.livingSize || propertyData.building.size.universalSize).toLocaleString()}`
                        : undefined
                    }
                  />
                  <PropertyField
                    label="Year Built"
                    value={propertyData.building?.summary?.yearBuilt || propertyData.summary?.yearBuilt}
                  />
                  <PropertyField
                    label="Lot Size"
                    value={
                      propertyData.lot?.lotSize2
                        ? `${propertyData.lot.lotSize2.toFixed(2)} acres`
                        : propertyData.lot?.lotSize1
                          ? `${propertyData.lot.lotSize1.toLocaleString()} sqft`
                          : undefined
                    }
                  />
                  <PropertyField
                    label="Stories"
                    value={propertyData.building?.summary?.storyDesc || propertyData.building?.summary?.levels}
                  />
                </div>
              </div>

              {propertyData.owner && (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>Ownership</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "8px 20px",
                    }}
                  >
                    <PropertyField label="Owner" value={propertyData.owner.owner1?.fullName} />
                    {propertyData.owner.owner2?.fullName && (
                      <PropertyField label="Owner 2" value={propertyData.owner.owner2.fullName} />
                    )}
                    <PropertyField
                      label="Absentee"
                      value={
                        propertyData.owner.absenteeOwnerStatus ||
                        (propertyData.summary?.absenteeInd === "O"
                          ? "Yes"
                          : propertyData.summary?.absenteeInd === "S"
                            ? "No"
                            : undefined)
                      }
                    />
                    <PropertyField label="Mailing Address" value={propertyData.owner.mailingAddressOneLine} />
                  </div>
                </div>
              )}

              {propertyData.mortgage?.amount != null && (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>Mortgage</h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "8px 20px",
                    }}
                  >
                    <PropertyField label="Loan Amount" value={`$${propertyData.mortgage.amount.toLocaleString()}`} />
                    <PropertyField label="Lender" value={propertyData.mortgage.lender?.fullName} />
                    <PropertyField label="Loan Type" value={propertyData.mortgage.loanType} />
                    <PropertyField label="Term" value={propertyData.mortgage.term} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, href }: { label: string; value?: string; href?: string }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", marginBottom: 2 }}>{label}</div>
      {href ? (
        <a href={href} style={{ fontSize: 14, color: "#3b82f6", textDecoration: "none" }}>
          {value}
        </a>
      ) : (
        <div style={{ fontSize: 14, color: "#111827" }}>{value}</div>
      )}
    </div>
  );
}

function PropertyField({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
