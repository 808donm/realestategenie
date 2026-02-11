"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  tags?: string[];
  dateAdded?: string;
}

export default function ContactsClient() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // New contact form state
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    city: "",
    state: "",
    postalCode: "",
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      params.append("limit", "100");

      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch contacts");
      }

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle adding a new contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError("");

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create contact");
      }

      // Reset form and refresh contacts
      setNewContact({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address1: "",
        city: "",
        state: "",
        postalCode: "",
      });
      setShowAddForm(false);
      fetchContacts();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setIsAdding(false);
    }
  };

  // Get display name for contact
  const getDisplayName = (contact: Contact): string => {
    if (contact.name) return contact.name;
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
    }
    return contact.email || contact.phone || "Unknown";
  };

  // Group contacts alphabetically
  const groupedContacts = contacts.reduce((acc, contact) => {
    const name = getDisplayName(contact);
    const firstLetter = name.charAt(0).toUpperCase();
    const key = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
    if (!acc[key]) acc[key] = [];
    acc[key].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const sortedKeys = Object.keys(groupedContacts).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      {/* Search and Add Button */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search contacts by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
            }}
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "12px 20px",
            background: showAddForm ? "#6b7280" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Contact"}
        </button>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div
          style={{
            padding: 20,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            Add New Contact to GoHighLevel
          </h3>
          {addError && (
            <div style={{ padding: 12, background: "#fee2e2", color: "#dc2626", borderRadius: 6, marginBottom: 16 }}>
              {addError}
            </div>
          )}
          <form onSubmit={handleAddContact}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={newContact.firstName}
                  onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={newContact.lastName}
                  onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+1234567890"
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  Address
                </label>
                <input
                  type="text"
                  value={newContact.address1}
                  onChange={(e) => setNewContact({ ...newContact, address1: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  City
                </label>
                <input
                  type="text"
                  value={newContact.city}
                  onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  State
                </label>
                <input
                  type="text"
                  value={newContact.state}
                  onChange={(e) => setNewContact({ ...newContact, state: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
                  Postal Code
                </label>
                <input
                  type="text"
                  value={newContact.postalCode}
                  onChange={(e) => setNewContact({ ...newContact, postalCode: e.target.value })}
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={isAdding || (!newContact.firstName && !newContact.lastName && !newContact.email && !newContact.phone)}
                style={{
                  padding: "10px 20px",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: isAdding ? "wait" : "pointer",
                  opacity: isAdding ? 0.7 : 1,
                }}
              >
                {isAdding ? "Adding..." : "Add Contact"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ padding: 16, background: "#fee2e2", color: "#dc2626", borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            background: "#f9fafb",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>
            {search ? "No contacts found matching your search." : "No contacts found in GoHighLevel."}
          </p>
          <p style={{ fontSize: 14 }}>
            {search ? "Try a different search term." : "Add your first contact using the button above."}
          </p>
        </div>
      ) : (
        /* Contacts List */
        <div>
          <div style={{ marginBottom: 12, fontSize: 14, color: "#6b7280" }}>
            Showing {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </div>

          {sortedKeys.map((letter) => (
            <div key={letter} style={{ marginBottom: 24 }}>
              {/* Letter Header */}
              <div
                style={{
                  padding: "8px 12px",
                  background: "#f3f4f6",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                {letter}
              </div>

              {/* Contacts in this letter group */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groupedContacts[letter].map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => router.push(`/app/contacts/${contact.id}`)}
                    style={{
                      padding: 16,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      cursor: "pointer",
                      transition: "box-shadow 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.boxShadow = "0 1px 4px rgba(59,130,246,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {getDisplayName(contact)}
                      </div>
                      {contact.email && (
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} style={{ color: "#3b82f6" }}>
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: "#3b82f6" }}>
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right", fontSize: 13 }}>
                      {(contact.city || contact.state) && (
                        <div style={{ color: "#6b7280" }}>
                          {[contact.city, contact.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {contact.tags && contact.tags.length > 0 && (
                        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {contact.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: "2px 8px",
                                background: "#e0e7ff",
                                color: "#3730a3",
                                borderRadius: 12,
                                fontSize: 11,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 3 && (
                            <span style={{ fontSize: 11, color: "#6b7280" }}>
                              +{contact.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
