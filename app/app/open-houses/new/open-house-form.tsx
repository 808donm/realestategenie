"use client";

import { useState } from "react";

type PMProperty = {
  id: string;
  address: string;
  city?: string;
  state_province?: string;
  zip_postal_code?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  monthly_rent?: number;
  security_deposit?: number;
  pet_policy?: string;
  description?: string;
  amenities?: string[];
  features?: string[];
  property_photo_url?: string;
};

type OpenHouseFormProps = {
  pmProperties: PMProperty[];
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
  const [selectedProperty, setSelectedProperty] = useState<PMProperty | null>(null);
  const [address, setAddress] = useState<string>("");

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);

    if (propertyId) {
      const property = pmProperties.find((p) => p.id === propertyId);
      if (property) {
        setSelectedProperty(property);
        // Build full address string
        let fullAddress = property.address;
        if (property.city) fullAddress += `, ${property.city}`;
        if (property.state_province) fullAddress += `, ${property.state_province}`;
        if (property.zip_postal_code) fullAddress += ` ${property.zip_postal_code}`;
        setAddress(fullAddress);
      }
    } else {
      setSelectedProperty(null);
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

      {/* Property Details Preview (when property is selected) */}
      {selectedProperty && (
        <div
          style={{
            padding: 16,
            background: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
            Selected Property Details
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {/* Property Type & Specs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
              {selectedProperty.property_type && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Type</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {selectedProperty.property_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              )}
              {selectedProperty.bedrooms && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Bedrooms</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedProperty.bedrooms}</div>
                </div>
              )}
              {selectedProperty.bathrooms && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Bathrooms</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedProperty.bathrooms}</div>
                </div>
              )}
              {selectedProperty.square_feet && (
                <div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Sq Ft</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedProperty.square_feet.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Rent & Deposits */}
            {(selectedProperty.monthly_rent || selectedProperty.security_deposit) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                {selectedProperty.monthly_rent && (
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Monthly Rent</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      ${selectedProperty.monthly_rent.toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedProperty.security_deposit && (
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Security Deposit</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      ${selectedProperty.security_deposit.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {selectedProperty.description && (
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedProperty.description}</div>
              </div>
            )}

            {/* Pet Policy */}
            {selectedProperty.pet_policy && (
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Pet Policy</div>
                <div style={{ fontSize: 13 }}>{selectedProperty.pet_policy}</div>
              </div>
            )}

            {/* Features */}
            {selectedProperty.features && selectedProperty.features.length > 0 && (
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Features</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedProperty.features.map((feature, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        background: "#fff",
                        border: "1px solid #dee2e6",
                        borderRadius: 4,
                      }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Amenities</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedProperty.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        background: "#fff",
                        border: "1px solid #dee2e6",
                        borderRadius: 4,
                      }}
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
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
