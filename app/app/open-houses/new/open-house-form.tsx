"use client";

import { useState } from "react";

type OpenHouseFormProps = {
  pmProperties: Array<{
    id: string;
    address: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
  }>;
  startDefault: string;
  endDefault: string;
  onSubmit: (formData: FormData) => Promise<void>;
};

export default function OpenHouseForm({
  pmProperties,
  startDefault,
  endDefault,
  onSubmit,
}: OpenHouseFormProps) {
  const [eventType, setEventType] = useState<"sales" | "rental" | "both">("sales");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);

    if (propertyId) {
      const property = pmProperties.find((p) => p.id === propertyId);
      if (property) {
        // Build full address string
        let fullAddress = property.address;
        if (property.city) fullAddress += `, ${property.city}`;
        if (property.state_province) fullAddress += `, ${property.state_province}`;
        if (property.postal_code) fullAddress += ` ${property.postal_code}`;
        setAddress(fullAddress);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
      {/* Event Type Selector */}
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
          Open House Type
        </label>
        <select
          name="event_type"
          value={eventType}
          onChange={(e) => setEventType(e.target.value as "sales" | "rental" | "both")}
          style={{ width: "100%", padding: 10 }}
          required
        >
          <option value="sales">For Sale (Traditional Listing)</option>
          <option value="rental">For Rent (Rental Showing)</option>
          <option value="both">Both (Attendee Chooses)</option>
        </select>
        <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          {eventType === "sales" && "Traditional open house for a property for sale"}
          {eventType === "rental" && "Rental showing - attendees can submit rental applications"}
          {eventType === "both" && "Attendees choose whether they're interested in buying or renting"}
        </p>
      </div>

      {/* PM Property Selector (only for rental or both) */}
      {(eventType === "rental" || eventType === "both") && (
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
            Link to Rental Property {eventType === "rental" && "(Required)"}
          </label>
          {pmProperties.length > 0 ? (
            <>
              <select
                name="pm_property_id"
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                style={{ width: "100%", padding: 10 }}
                required={eventType === "rental"}
              >
                <option value="">
                  {eventType === "rental"
                    ? "Select a rental property..."
                    : "None (optional)"}
                </option>
                {pmProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
                {selectedPropertyId
                  ? "Property address will auto-populate below"
                  : "Link this open house to a rental property for application tracking"}
              </p>
            </>
          ) : (
            <div
              style={{
                padding: 12,
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: 6,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: "#856404" }}>
                <strong>No rental properties found.</strong> Create a rental property in the{" "}
                <a href="/app/pm/properties" style={{ color: "#856404", textDecoration: "underline" }}>
                  PM Module
                </a>{" "}
                first to link it to this open house.
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Address</label>
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: 10 }}
          placeholder="123 Main St, Honolulu, HI"
          required
        />
        <p style={{ fontSize: 11, opacity: 0.6, margin: "4px 0 0 0" }}>
          {selectedPropertyId
            ? "Auto-populated from selected rental property (editable)"
            : "We'll automatically geocode this address to show a map on your open house page."}
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Start</label>
          <input
            name="start_at"
            type="datetime-local"
            defaultValue={startDefault}
            style={{ width: "100%", padding: 10 }}
            required
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>End</label>
          <input
            name="end_at"
            type="datetime-local"
            defaultValue={endDefault}
            style={{ width: "100%", padding: 10 }}
            required
          />
        </div>
      </div>

      <button style={{ padding: 12, fontWeight: 900 }}>Create</button>
      <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
        After creating, you'll publish it and generate the QR check-in link.
      </p>
    </form>
  );
}
