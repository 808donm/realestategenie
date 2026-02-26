"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function ContactDetailClient({ contactId }: { contactId: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "conversations" | "property">("details");

  // ATTOM property enrichment state
  const [propertyData, setPropertyData] = useState<Record<string, any> | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [propertyError, setPropertyError] = useState("");
  const [propertySearched, setPropertySearched] = useState(false);

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

  const getDisplayName = (c: Contact): string => {
    if (c.name) return c.name;
    if (c.firstName || c.lastName) return `${c.firstName || ""} ${c.lastName || ""}`.trim();
    return c.email || c.phone || "Unknown";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Loading contact details...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link href="/app/contacts" style={{ color: "#3b82f6", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
          &larr; Back to Contacts
        </Link>
        <div style={{ padding: 16, background: "#fee2e2", color: "#dc2626", borderRadius: 8 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div>
        <Link href="/app/contacts" style={{ color: "#3b82f6", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
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
    { key: "notes", label: "Notes", count: notes.length },
    { key: "conversations", label: "Messages", count: conversations.length },
    { key: "property", label: "Property" },
  ];

  return (
    <div>
      <Link href="/app/contacts" style={{ color: "#3b82f6", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 16 }}>
        &larr; Back to Contacts
      </Link>

      {/* Header */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
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
              <a
                href={`mailto:${contact.email}`}
                style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}
              >
                Email
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                style={{ padding: "8px 16px", background: "#10b981", color: "#fff", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}
              >
                Call
              </a>
            )}
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
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #3b82f6" : "2px solid transparent",
              marginBottom: -2,
              color: activeTab === tab.key ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{ marginLeft: 6, padding: "1px 7px", background: activeTab === tab.key ? "#dbeafe" : "#f3f4f6", borderRadius: 10, fontSize: 11 }}>
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
            <InfoField label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
            <InfoField label="Phone" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
            {location && <InfoField label="Address" value={location} />}
            {contact.source && <InfoField label="Source" value={contact.source} />}
            {contact.dateAdded && <InfoField label="Date Added" value={formatDate(contact.dateAdded)} />}
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div>
          {notes.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
              No notes for this contact.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {notes.map((note) => (
                <div
                  key={note.id}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}
                >
                  {note.dateAdded && (
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
                      {formatDate(note.dateAdded)}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {note.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div>
          {conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
              No conversations for this contact.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}
                >
                  <div style={{ padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>
                      {conv.type || "Conversation"}
                    </span>
                    {conv.lastMessageDate && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {formatDate(conv.lastMessageDate)}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    {conv.messages.length === 0 ? (
                      <div style={{ fontSize: 13, color: "#9ca3af" }}>No messages</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {conv.messages.map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: msg.direction === "outbound" ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                maxWidth: "80%",
                                fontSize: 13,
                                lineHeight: 1.4,
                                background: msg.direction === "outbound" ? "#dbeafe" : "#f3f4f6",
                                color: "#1f2937",
                              }}
                            >
                              {msg.body || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>{msg.type || "Message"}</span>}
                            </div>
                            {msg.dateAdded && (
                              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                                {formatDate(msg.dateAdded)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Property Tab */}
      {activeTab === "property" && (
        <div>
          {!hasAddress && !propertySearched && (
            <div style={{ padding: 32, textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>No address on file</div>
              <div style={{ fontSize: 13 }}>Add an address to this contact in GoHighLevel to look up their property data.</div>
            </div>
          )}

          {hasAddress && !propertySearched && !propertyLoading && (
            <div style={{ padding: 32, textAlign: "center", background: "#f9fafb", borderRadius: 12 }}>
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 4, fontWeight: 600 }}>
                Look up property data for this contact
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                {location}
              </div>
              <button
                onClick={lookupProperty}
                style={{
                  padding: "10px 24px", background: "#3b82f6", color: "#fff", borderRadius: 8, border: "none",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
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
            <div style={{ padding: 16, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {propertyError}
              {hasAddress && (
                <button
                  onClick={lookupProperty}
                  style={{ marginLeft: 12, padding: "4px 12px", background: "#dc2626", color: "#fff", borderRadius: 6, border: "none", fontSize: 12, cursor: "pointer" }}
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {propertyData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Value Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {propertyData.avm?.amount?.value != null && (
                  <div style={{ padding: 16, background: "#ecfdf5", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>AVM Value</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>${propertyData.avm.amount.value.toLocaleString()}</div>
                    {propertyData.avm.amount.low != null && propertyData.avm.amount.high != null && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>${propertyData.avm.amount.low.toLocaleString()} – ${propertyData.avm.amount.high.toLocaleString()}</div>
                    )}
                  </div>
                )}
                {(propertyData.sale?.amount?.saleAmt || propertyData.sale?.amount?.salePrice) != null && (
                  <div style={{ padding: 16, background: "#eff6ff", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Last Sale</div>
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
                    <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Assessed Value</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed" }}>${propertyData.assessment.assessed.assdTtlValue.toLocaleString()}</div>
                    {propertyData.assessment.tax?.taxAmt != null && (
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Tax: ${propertyData.assessment.tax.taxAmt.toLocaleString()}/yr</div>
                    )}
                  </div>
                )}
                {propertyData.avm?.amount?.value != null && (propertyData.sale?.amount?.saleAmt || propertyData.sale?.amount?.salePrice) != null && (
                  <div style={{ padding: 16, background: "#fefce8", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#a16207", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Est. Equity</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#a16207" }}>
                      ${(propertyData.avm.amount.value - (propertyData.sale.amount.saleAmt || propertyData.sale.amount.salePrice)).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>Property Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 20px" }}>
                  <PropertyField label="Address" value={propertyData.address?.oneLine} />
                  <PropertyField label="Type" value={propertyData.summary?.propertyType || propertyData.summary?.propType} />
                  <PropertyField label="Beds" value={propertyData.building?.rooms?.beds} />
                  <PropertyField label="Baths" value={propertyData.building?.rooms?.bathsFull ?? propertyData.building?.rooms?.bathsTotal} />
                  <PropertyField label="Sqft" value={propertyData.building?.size?.livingSize || propertyData.building?.size?.universalSize ? `${(propertyData.building.size.livingSize || propertyData.building.size.universalSize).toLocaleString()}` : undefined} />
                  <PropertyField label="Year Built" value={propertyData.building?.summary?.yearBuilt || propertyData.summary?.yearBuilt} />
                  <PropertyField label="Lot Size" value={propertyData.lot?.lotSize2 ? `${propertyData.lot.lotSize2.toFixed(2)} acres` : propertyData.lot?.lotSize1 ? `${propertyData.lot.lotSize1.toLocaleString()} sqft` : undefined} />
                  <PropertyField label="Stories" value={propertyData.building?.summary?.storyDesc || propertyData.building?.summary?.levels} />
                </div>
              </div>

              {/* Ownership */}
              {propertyData.owner && (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>Ownership</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 20px" }}>
                    <PropertyField label="Owner" value={propertyData.owner.owner1?.fullName} />
                    {propertyData.owner.owner2?.fullName && <PropertyField label="Owner 2" value={propertyData.owner.owner2.fullName} />}
                    <PropertyField label="Absentee" value={propertyData.owner.absenteeOwnerStatus || (propertyData.summary?.absenteeInd === "O" ? "Yes" : propertyData.summary?.absenteeInd === "S" ? "No" : undefined)} />
                    <PropertyField label="Mailing Address" value={propertyData.owner.mailingAddressOneLine} />
                  </div>
                </div>
              )}

              {/* Mortgage */}
              {propertyData.mortgage?.amount != null && (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#374151" }}>Mortgage</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 20px" }}>
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
        <a href={href} style={{ fontSize: 14, color: "#3b82f6", textDecoration: "none" }}>{value}</a>
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
      <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{value}</div>
    </div>
  );
}
