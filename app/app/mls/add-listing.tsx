"use client";

import { useState, useRef } from "react";

interface ListingPhoto {
  url: string;
  path: string;
  order: number;
  description: string;
}

interface AddListingFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editListing?: Record<string, unknown> | null;
}

const PROPERTY_TYPES = ["Residential", "Residential Income", "Commercial", "Land", "Farm"] as const;

const PROPERTY_SUB_TYPES: Record<string, string[]> = {
  Residential: ["Single Family Residence", "Condo/Co-op", "Townhouse", "Multi-Family", "Manufactured Home", "Mobile Home"],
  "Residential Income": ["Duplex", "Triplex", "Fourplex", "Apartment", "Mixed Use"],
  Commercial: ["Office", "Retail", "Industrial", "Warehouse", "Mixed Use", "Restaurant/Bar"],
  Land: ["Residential Lot", "Commercial Lot", "Farm/Ranch", "Unimproved", "Subdivision"],
  Farm: ["Crop", "Dairy", "Horse", "Livestock", "Orchard", "Ranch"],
};

const STATUS_OPTIONS = ["Draft", "Active", "Pending", "Closed", "Withdrawn", "Expired", "Canceled"] as const;

const STREET_SUFFIXES = [
  "Ave", "Blvd", "Cir", "Ct", "Dr", "Hwy", "Ln", "Pkwy", "Pl", "Rd", "St", "Ter", "Trl", "Way",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export default function AddListingForm({ onClose, onSuccess, editListing }: AddListingFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("address");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form state - pre-populate if editing
  const edit = editListing || {};
  const [form, setForm] = useState({
    status: (edit.status as string) || "Draft",
    // Address
    street_number: (edit.street_number as string) || "",
    street_name: (edit.street_name as string) || "",
    street_suffix: (edit.street_suffix as string) || "",
    unit_number: (edit.unit_number as string) || "",
    city: (edit.city as string) || "",
    state_or_province: (edit.state_or_province as string) || "NJ",
    postal_code: (edit.postal_code as string) || "",
    // Property
    property_type: (edit.property_type as string) || "Residential",
    property_sub_type: (edit.property_sub_type as string) || "",
    bedrooms_total: (edit.bedrooms_total as string)?.toString() || "",
    bathrooms_total: (edit.bathrooms_total as string)?.toString() || "",
    living_area: (edit.living_area as string)?.toString() || "",
    lot_size_area: (edit.lot_size_area as string)?.toString() || "",
    year_built: (edit.year_built as string)?.toString() || "",
    stories: (edit.stories as string)?.toString() || "",
    garage_spaces: (edit.garage_spaces as string)?.toString() || "",
    parking_total: (edit.parking_total as string)?.toString() || "",
    // Pricing
    list_price: (edit.list_price as string)?.toString() || "",
    original_list_price: (edit.original_list_price as string)?.toString() || "",
    close_price: (edit.close_price as string)?.toString() || "",
    // Description
    public_remarks: (edit.public_remarks as string) || "",
    private_remarks: (edit.private_remarks as string) || "",
    // Agent
    list_agent_name: (edit.list_agent_name as string) || "",
    list_agent_email: (edit.list_agent_email as string) || "",
    list_agent_phone: (edit.list_agent_phone as string) || "",
    list_office_name: (edit.list_office_name as string) || "",
    // Dates
    on_market_date: (edit.on_market_date as string) || "",
    listing_contract_date: (edit.listing_contract_date as string) || "",
    close_date: (edit.close_date as string) || "",
    expiration_date: (edit.expiration_date as string) || "",
  });

  const [photos, setPhotos] = useState<ListingPhoto[]>(
    (edit.photos as ListingPhoto[]) || []
  );

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    setError("");

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/mls/listings/upload-photo", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to upload photo");
        }

        setPhotos((prev) => [
          ...prev,
          {
            url: data.url,
            path: data.path,
            order: prev.length,
            description: "",
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i })));
  };

  const movePhoto = (index: number, direction: "up" | "down") => {
    setPhotos((prev) => {
      const arr = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= arr.length) return prev;
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr.map((p, i) => ({ ...p, order: i }));
    });
  };

  // Submit form
  const handleSubmit = async () => {
    setError("");

    if (!form.city.trim()) { setError("City is required"); return; }
    if (!form.postal_code.trim()) { setError("Postal code is required"); return; }
    if (!form.list_price.trim()) { setError("List price is required"); return; }

    setIsSaving(true);

    try {
      const payload = {
        ...form,
        bedrooms_total: form.bedrooms_total ? parseInt(form.bedrooms_total) : null,
        bathrooms_total: form.bathrooms_total ? parseInt(form.bathrooms_total) : null,
        living_area: form.living_area ? parseFloat(form.living_area) : null,
        lot_size_area: form.lot_size_area ? parseFloat(form.lot_size_area) : null,
        year_built: form.year_built ? parseInt(form.year_built) : null,
        stories: form.stories ? parseInt(form.stories) : null,
        garage_spaces: form.garage_spaces ? parseInt(form.garage_spaces) : null,
        parking_total: form.parking_total ? parseInt(form.parking_total) : null,
        list_price: parseFloat(form.list_price),
        original_list_price: form.original_list_price ? parseFloat(form.original_list_price) : null,
        close_price: form.close_price ? parseFloat(form.close_price) : null,
        photos,
      };

      const isEdit = !!editListing?.id;
      const url = isEdit ? `/api/mls/listings/${editListing.id}` : "/api/mls/listings";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save listing");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: "address", label: "Address" },
    { id: "property", label: "Property Details" },
    { id: "pricing", label: "Pricing & Dates" },
    { id: "description", label: "Description" },
    { id: "agent", label: "Agent Info" },
    { id: "photos", label: "Photos" },
  ];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 4,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: "1px solid #e5e7eb",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "20px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 900,
          width: "100%",
          maxHeight: "95vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {editListing ? "Edit Listing" : "Add New Listing"}
          </h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                background: form.status === "Active" ? "#dcfce7" : form.status === "Draft" ? "#f3f4f6" : "#fff",
                color: form.status === "Active" ? "#16a34a" : "#374151",
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={onClose}
              style={{
                padding: "6px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid #e5e7eb",
            overflowX: "auto",
            flexShrink: 0,
          }}
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                padding: "12px 20px",
                fontSize: 13,
                fontWeight: 600,
                color: activeSection === s.id ? "#3b82f6" : "#6b7280",
                background: "transparent",
                border: "none",
                borderBottom: activeSection === s.id ? "2px solid #3b82f6" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              margin: "16px 24px 0",
              padding: 12,
              background: "#fee2e2",
              color: "#dc2626",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Form body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* ADDRESS SECTION */}
          {activeSection === "address" && (
            <div>
              <div style={sectionTitleStyle}>Property Address</div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 120px", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Street #</label>
                  <input
                    type="text"
                    value={form.street_number}
                    onChange={(e) => updateField("street_number", e.target.value)}
                    placeholder="123"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Street Name</label>
                  <input
                    type="text"
                    value={form.street_name}
                    onChange={(e) => updateField("street_name", e.target.value)}
                    placeholder="Main"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Suffix</label>
                  <select
                    value={form.street_suffix}
                    onChange={(e) => updateField("street_suffix", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select</option>
                    {STREET_SUFFIXES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Unit / Apt #</label>
                  <input
                    type="text"
                    value={form.unit_number}
                    onChange={(e) => updateField("unit_number", e.target.value)}
                    placeholder="Optional"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Postal Code *</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => updateField("postal_code", e.target.value)}
                    placeholder="07001"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="City"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <select
                    value={form.state_or_province}
                    onChange={(e) => updateField("state_or_province", e.target.value)}
                    style={inputStyle}
                  >
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PROPERTY DETAILS SECTION */}
          {activeSection === "property" && (
            <div>
              <div style={sectionTitleStyle}>Property Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Property Type</label>
                  <select
                    value={form.property_type}
                    onChange={(e) => {
                      updateField("property_type", e.target.value);
                      updateField("property_sub_type", "");
                    }}
                    style={inputStyle}
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Sub Type</label>
                  <select
                    value={form.property_sub_type}
                    onChange={(e) => updateField("property_sub_type", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select</option>
                    {(PROPERTY_SUB_TYPES[form.property_type] || []).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Bedrooms</label>
                  <input
                    type="number"
                    value={form.bedrooms_total}
                    onChange={(e) => updateField("bedrooms_total", e.target.value)}
                    placeholder="3"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Bathrooms</label>
                  <input
                    type="number"
                    value={form.bathrooms_total}
                    onChange={(e) => updateField("bathrooms_total", e.target.value)}
                    placeholder="2"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Living Area (sqft)</label>
                  <input
                    type="number"
                    value={form.living_area}
                    onChange={(e) => updateField("living_area", e.target.value)}
                    placeholder="1800"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Lot Size (sqft)</label>
                  <input
                    type="number"
                    value={form.lot_size_area}
                    onChange={(e) => updateField("lot_size_area", e.target.value)}
                    placeholder="5000"
                    min="0"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Year Built</label>
                  <input
                    type="number"
                    value={form.year_built}
                    onChange={(e) => updateField("year_built", e.target.value)}
                    placeholder="2005"
                    min="1800"
                    max="2030"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Stories</label>
                  <input
                    type="number"
                    value={form.stories}
                    onChange={(e) => updateField("stories", e.target.value)}
                    placeholder="2"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Garage Spaces</label>
                  <input
                    type="number"
                    value={form.garage_spaces}
                    onChange={(e) => updateField("garage_spaces", e.target.value)}
                    placeholder="2"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Total Parking</label>
                  <input
                    type="number"
                    value={form.parking_total}
                    onChange={(e) => updateField("parking_total", e.target.value)}
                    placeholder="4"
                    min="0"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PRICING & DATES SECTION */}
          {activeSection === "pricing" && (
            <div>
              <div style={sectionTitleStyle}>Pricing</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={labelStyle}>List Price *</label>
                  <input
                    type="number"
                    value={form.list_price}
                    onChange={(e) => updateField("list_price", e.target.value)}
                    placeholder="450000"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Original List Price</label>
                  <input
                    type="number"
                    value={form.original_list_price}
                    onChange={(e) => updateField("original_list_price", e.target.value)}
                    placeholder="475000"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Close Price</label>
                  <input
                    type="number"
                    value={form.close_price}
                    onChange={(e) => updateField("close_price", e.target.value)}
                    placeholder="440000"
                    min="0"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={sectionTitleStyle}>Key Dates</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <div>
                  <label style={labelStyle}>On Market Date</label>
                  <input
                    type="date"
                    value={form.on_market_date}
                    onChange={(e) => updateField("on_market_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Listing Contract Date</label>
                  <input
                    type="date"
                    value={form.listing_contract_date}
                    onChange={(e) => updateField("listing_contract_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Close Date</label>
                  <input
                    type="date"
                    value={form.close_date}
                    onChange={(e) => updateField("close_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Expiration Date</label>
                  <input
                    type="date"
                    value={form.expiration_date}
                    onChange={(e) => updateField("expiration_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DESCRIPTION SECTION */}
          {activeSection === "description" && (
            <div>
              <div style={sectionTitleStyle}>Description</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Public Remarks</label>
                <textarea
                  value={form.public_remarks}
                  onChange={(e) => updateField("public_remarks", e.target.value)}
                  placeholder="Describe the property for buyers. This will be visible on the listing..."
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  {form.public_remarks.length} / 4,000 characters
                </div>
              </div>
              <div>
                <label style={labelStyle}>Private Remarks (Agent Only)</label>
                <textarea
                  value={form.private_remarks}
                  onChange={(e) => updateField("private_remarks", e.target.value)}
                  placeholder="Internal notes visible only to agents..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
          )}

          {/* AGENT INFO SECTION */}
          {activeSection === "agent" && (
            <div>
              <div style={sectionTitleStyle}>Listing Agent Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Agent Name</label>
                  <input
                    type="text"
                    value={form.list_agent_name}
                    onChange={(e) => updateField("list_agent_name", e.target.value)}
                    placeholder="John Smith"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Agent Email</label>
                  <input
                    type="email"
                    value={form.list_agent_email}
                    onChange={(e) => updateField("list_agent_email", e.target.value)}
                    placeholder="john@example.com"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Agent Phone</label>
                  <input
                    type="tel"
                    value={form.list_agent_phone}
                    onChange={(e) => updateField("list_agent_phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Office Name</label>
                  <input
                    type="text"
                    value={form.list_office_name}
                    onChange={(e) => updateField("list_office_name", e.target.value)}
                    placeholder="Keller Williams Realty"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PHOTOS SECTION */}
          {activeSection === "photos" && (
            <div>
              <div style={sectionTitleStyle}>Listing Photos</div>

              {/* Upload button */}
              <div
                style={{
                  border: "2px dashed #d1d5db",
                  borderRadius: 12,
                  padding: 32,
                  textAlign: "center",
                  marginBottom: 20,
                  cursor: uploadingPhoto ? "wait" : "pointer",
                  background: "#f9fafb",
                }}
                onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <div style={{ fontSize: 32, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  {uploadingPhoto ? "Uploading..." : "Click to upload photos"}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  JPEG, PNG, WebP, HEIC — Max 10MB per photo
                </div>
              </div>

              {/* Photo grid */}
              {photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {photos.map((photo, index) => (
                    <div
                      key={photo.path || index}
                      style={{
                        position: "relative",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={photo.description || `Photo ${index + 1}`}
                        style={{ width: "100%", height: 140, objectFit: "cover" }}
                      />
                      {index === 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            background: "#3b82f6",
                            color: "#fff",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          PRIMARY
                        </span>
                      )}
                      <div
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          display: "flex",
                          gap: 4,
                        }}
                      >
                        {index > 0 && (
                          <button
                            onClick={() => movePhoto(index, "up")}
                            style={{
                              width: 24,
                              height: 24,
                              background: "rgba(255,255,255,0.9)",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Move left"
                          >
                            ←
                          </button>
                        )}
                        {index < photos.length - 1 && (
                          <button
                            onClick={() => movePhoto(index, "down")}
                            style={{
                              width: 24,
                              height: 24,
                              background: "rgba(255,255,255,0.9)",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Move right"
                          >
                            →
                          </button>
                        )}
                        <button
                          onClick={() => removePhoto(index)}
                          style={{
                            width: 24,
                            height: 24,
                            background: "rgba(239,68,68,0.9)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ padding: 8 }}>
                        <input
                          type="text"
                          placeholder="Photo description"
                          value={photo.description}
                          onChange={(e) => {
                            setPhotos((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, description: e.target.value } : p))
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            border: "1px solid #e5e7eb",
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {photos.length === 0 && (
                <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
                  No photos uploaded yet. Add photos to make your listing stand out.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with save buttons */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            * Required fields: City, Postal Code, List Price
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#fff",
                color: "#374151",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              style={{
                padding: "10px 24px",
                border: "none",
                borderRadius: 8,
                background: isSaving ? "#93c5fd" : "#3b82f6",
                color: "#fff",
                fontWeight: 600,
                cursor: isSaving ? "wait" : "pointer",
              }}
            >
              {isSaving
                ? "Saving..."
                : editListing
                  ? "Update Listing"
                  : "Create Listing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
