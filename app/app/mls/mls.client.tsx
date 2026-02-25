"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface TrestleMedia {
  MediaKey: string;
  MediaURL: string;
  MediaType: string;
  Order?: number;
  ShortDescription?: string;
}

interface Property {
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  PropertyType: string;
  PropertySubType?: string;
  ListPrice: number;
  ClosePrice?: number;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  UnparsedAddress?: string;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeArea?: number;
  YearBuilt?: number;
  PublicRemarks?: string;
  ListAgentFullName?: string;
  ListOfficeName?: string;
  OnMarketDate?: string;
  ModificationTimestamp: string;
  PhotosCount?: number;
  Media?: TrestleMedia[];
  ListingURL?: string;
  VirtualTourURLUnbranded?: string;
}

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

const STATUS_OPTIONS = ["Active", "Pending", "Closed"] as const;
const PROPERTY_TYPES = [
  "Residential",
  "Residential Income",
  "Commercial",
  "Land",
  "Farm",
] as const;

const PROPERTY_FEATURES = [
  "Updated Kitchen",
  "Granite/Quartz Countertops",
  "Stainless Steel Appliances",
  "Hardwood Floors",
  "Open Floor Plan",
  "Primary Suite",
  "Fireplace",
  "Vaulted Ceilings",
  "Crown Molding",
  "New Roof",
  "New HVAC",
  "Energy Efficient",
  "Smart Home Features",
  "Pool",
  "Spa / Hot Tub",
  "Covered Patio / Deck",
  "Outdoor Kitchen",
  "Fenced Yard",
  "2-Car Garage",
  "3-Car Garage",
  "RV Parking",
  "Mountain Views",
  "Water Views",
  "Corner Lot",
  "Cul-de-Sac",
  "Gated Community",
  "HOA Amenities",
] as const;

export default function MLSClient() {
  const searchParams = useSearchParams();

  // Search state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "Active" as string,
    minPrice: "",
    maxPrice: "",
    minBeds: "",
    minBaths: "",
    propertyType: "",
  });

  // Data state
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  // Latest listings state
  const [latestProperties, setLatestProperties] = useState<Property[]>([]);
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [latestError, setLatestError] = useState("");

  // Detail modal state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Listings state
  const [myListings, setMyListings] = useState<Record<string, unknown>[]>([]);
  const [isLoadingMyListings, setIsLoadingMyListings] = useState(true);
  const [activeTab, setActiveTab] = useState<"mls" | "my-listings">("mls");

  // AI Description Generator state
  const [showDescGen, setShowDescGen] = useState(false);
  const [descForm, setDescForm] = useState({
    propertyType: "Single Family Residential",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    yearBuilt: "",
    lotSize: "",
    architecturalStyle: "",
    additionalNotes: "",
  });
  const [descFeatures, setDescFeatures] = useState<string[]>([]);
  const [descLoading, setDescLoading] = useState(false);
  const [descResults, setDescResults] = useState<{ tone: string; label: string; description: string }[] | null>(null);
  const [descError, setDescError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Send to contact state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendProperty, setSendProperty] = useState<Property | null>(null);
  const [contacts, setContacts] = useState<GHLContact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [sendingContactId, setSendingContactId] = useState("");
  const [sendMode, setSendMode] = useState<"email" | "attach">("attach");
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Open property detail from ?listing= URL param (used in shared links)
  useEffect(() => {
    const listingKey = searchParams.get("listing");
    if (!listingKey) return;

    const fetchListing = async () => {
      try {
        const response = await fetch("/api/integrations/trestle/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingKey, includeMedia: true }),
        });
        const data = await response.json();
        if (response.ok && data.property) {
          const property = data.property as Property;
          if (data.media) property.Media = data.media;
          setSelectedProperty(property);
        }
      } catch {
        // Silently fail - user can still search manually
      }
    };

    fetchListing();
  }, [searchParams]);

  // Fetch 6 latest listings on mount
  useEffect(() => {
    const fetchLatest = async () => {
      setIsLoadingLatest(true);
      setLatestError("");
      try {
        const response = await fetch("/api/mls/search?status=Active,Pending,Closed&limit=6");
        const data = await response.json();
        if (!response.ok) {
          setLatestError(data.error || "Failed to load latest listings");
          return;
        }
        if (data.properties) {
          setLatestProperties(data.properties);
        }
      } catch (err) {
        setLatestError(err instanceof Error ? err.message : "Failed to load latest listings");
      } finally {
        setIsLoadingLatest(false);
      }
    };

    fetchLatest();
  }, []);

  // Fetch user's own listings
  const fetchMyListings = useCallback(async () => {
    setIsLoadingMyListings(true);
    try {
      const response = await fetch("/api/mls/listings?limit=50");
      const data = await response.json();
      if (response.ok && data.listings) {
        setMyListings(data.listings);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingMyListings(false);
    }
  }, []);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Search properties
  const searchProperties = useCallback(
    async (newOffset = 0) => {
      if (!debouncedQuery && !filters.minPrice && !filters.maxPrice && !filters.minBeds && !filters.minBaths) {
        return;
      }

      setIsLoading(true);
      setError("");
      setOffset(newOffset);

      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.append("q", debouncedQuery);
        if (filters.status) params.append("status", filters.status);
        if (filters.minPrice) params.append("minPrice", filters.minPrice);
        if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
        if (filters.minBeds) params.append("minBeds", filters.minBeds);
        if (filters.minBaths) params.append("minBaths", filters.minBaths);
        if (filters.propertyType) params.append("propertyType", filters.propertyType);
        params.append("limit", limit.toString());
        params.append("offset", newOffset.toString());

        const response = await fetch(`/api/mls/search?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        setProperties(data.properties || []);
        setTotalCount(data.totalCount || 0);
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search MLS");
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedQuery, filters, limit]
  );

  // Trigger search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery || filters.minPrice || filters.maxPrice || filters.minBeds || filters.minBaths) {
      searchProperties(0);
    }
  }, [debouncedQuery, searchProperties]);

  // Handle explicit search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProperties(0);
  };

  // Format price
  const formatPrice = (price: number) => {
    if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
    if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
    return `$${price.toLocaleString()}`;
  };

  // Get address string
  const getAddress = (p: Property) => {
    if (p.UnparsedAddress) return p.UnparsedAddress;
    return [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" ");
  };

  // Get photo URL
  const getPhotoUrl = (p: Property) => {
    if (p.Media && p.Media.length > 0) {
      const sorted = [...p.Media].sort((a, b) => (a.Order || 0) - (b.Order || 0));
      return sorted[0].MediaURL;
    }
    return null;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return { bg: "#dcfce7", text: "#16a34a" };
      case "Pending":
        return { bg: "#fef3c7", text: "#d97706" };
      case "Closed":
        return { bg: "#e0e7ff", text: "#4f46e5" };
      case "Draft":
        return { bg: "#f3f4f6", text: "#6b7280" };
      case "Withdrawn":
      case "Expired":
      case "Canceled":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  // Open send-to-contact modal
  const openSendModal = (property: Property, mode: "email" | "attach") => {
    setSendProperty(property);
    setSendMode(mode);
    setShowSendModal(true);
    setSendResult(null);
    setContactSearch("");
    setContacts([]);
  };

  // Contact search error
  const [contactError, setContactError] = useState("");

  // Fetch contacts for send modal
  const fetchContacts = async (search: string) => {
    setIsLoadingContacts(true);
    setContactError("");
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("limit", "20");

      const response = await fetch(`/api/contacts?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setContactError(data.error || "Failed to load contacts");
        return;
      }
      setContacts(data.contacts || []);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Debounced contact search
  useEffect(() => {
    if (!showSendModal) return;
    const timer = setTimeout(() => {
      fetchContacts(contactSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch, showSendModal]);

  // Send property to contact
  const sendToContact = async (contactId: string) => {
    if (!sendProperty) return;
    setSendingContactId(contactId);
    setSendResult(null);

    try {
      const response = await fetch("/api/mls/send-to-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          property: sendProperty,
          mode: sendMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send");
      }

      setSendResult({
        success: true,
        message: sendMode === "email"
          ? "Listing emailed to contact successfully!"
          : "Listing attached to contact successfully!",
      });
    } catch (err) {
      setSendResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to process listing",
      });
    } finally {
      setSendingContactId("");
    }
  };

  const getContactDisplayName = (contact: GHLContact) => {
    if (contact.name) return contact.name;
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
    }
    return contact.email || contact.phone || "Unknown";
  };

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  // Helper for my listings
  const getMyListingAddress = (l: Record<string, unknown>) => {
    if (l.unparsed_address) return l.unparsed_address as string;
    return [l.street_number, l.street_name, l.street_suffix].filter(Boolean).join(" ");
  };

  const getMyListingPhoto = (l: Record<string, unknown>) => {
    const photoArr = l.photos as { url: string; order: number }[] | undefined;
    if (photoArr && photoArr.length > 0) {
      const sorted = [...photoArr].sort((a, b) => (a.order || 0) - (b.order || 0));
      return sorted[0].url;
    }
    return null;
  };


  return (
    <div>
      {/* Tab Navigation + Add Listing Button */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab("mls")}
          style={{
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "mls" ? "#3b82f6" : "#6b7280",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "mls" ? "2px solid #3b82f6" : "2px solid transparent",
            cursor: "pointer",
          }}
        >
          MLS Search
        </button>
        <button
          onClick={() => setActiveTab("my-listings")}
          style={{
            padding: "10px 24px",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "my-listings" ? "#3b82f6" : "#6b7280",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "my-listings" ? "2px solid #3b82f6" : "2px solid transparent",
            cursor: "pointer",
          }}
        >
          My Listings
          {myListings.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                padding: "2px 8px",
                background: "#e5e7eb",
                borderRadius: 10,
                fontSize: 12,
              }}
            >
              {myListings.length}
            </span>
          )}
        </button>
      </div>

      {/* MLS Search Tab */}
      {activeTab === "mls" && (
        <>
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <input
              type="text"
              placeholder="Search by city name or zip code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 15,
                outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "12px 24px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: isLoading ? "wait" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Searching..." : "Search MLS"}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "12px 16px",
              background: showFilters ? "#e5e7eb" : "#fff",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Filters {showFilters ? "▲" : "▼"}
          </button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div
          style={{
            padding: 20,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="Active,Pending">Active & Pending</option>
                <option value="Active,Pending,Closed">All</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                Min Price
              </label>
              <input
                type="number"
                placeholder="e.g. 200000"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                Max Price
              </label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                Min Beds
              </label>
              <select
                value={filters.minBeds}
                onChange={(e) => setFilters({ ...filters, minBeds: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                Min Baths
              </label>
              <select
                value={filters.minBaths}
                onChange={(e) => setFilters({ ...filters, minBaths: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
              >
                <option value="">Any</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                Property Type
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
              >
                <option value="">Any</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: 16,
            background: "#fee2e2",
            color: "#dc2626",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          Searching MLS listings...
        </div>
      )}

      {/* Latest Listings - shown before user searches */}
      {!isLoading && !hasSearched && (
        <div>
          {latestError && (
            <div
              style={{
                padding: 16,
                background: "#fef3c7",
                color: "#92400e",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {latestError}
            </div>
          )}
          {isLoadingLatest ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              Loading latest listings...
            </div>
          ) : latestProperties.length > 0 ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: "#374151" }}>
                Latest Listings
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {latestProperties.map((property) => {
                  const photoUrl = getPhotoUrl(property);
                  const statusColor = getStatusColor(property.StandardStatus);
                  const address = getAddress(property);

                  return (
                    <div
                      key={property.ListingKey}
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "box-shadow 0.2s",
                      }}
                      onClick={() => setSelectedProperty(property)}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                    >
                      <div
                        style={{
                          height: 200,
                          background: photoUrl ? `url(${photoUrl}) center/cover` : "#e5e7eb",
                          position: "relative",
                        }}
                      >
                        {!photoUrl && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: "100%",
                              color: "#9ca3af",
                              fontSize: 14,
                            }}
                          >
                            No Photo Available
                          </div>
                        )}
                        <span
                          style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            padding: "4px 10px",
                            background: statusColor.bg,
                            color: statusColor.text,
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {property.StandardStatus}
                        </span>
                      </div>
                      <div style={{ padding: 16 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                          {formatPrice(property.ListPrice)}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                          {address || "Address not available"}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                          {property.City}, {property.StateOrProvince} {property.PostalCode}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6b7280" }}>
                          {property.BedroomsTotal != null && (
                            <span><strong>{property.BedroomsTotal}</strong> bed</span>
                          )}
                          {property.BathroomsTotalInteger != null && (
                            <span><strong>{property.BathroomsTotalInteger}</strong> bath</span>
                          )}
                          {property.LivingArea != null && (
                            <span><strong>{property.LivingArea.toLocaleString()}</strong> sqft</span>
                          )}
                          {property.YearBuilt != null && <span>Built {property.YearBuilt}</span>}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
                          MLS# {property.ListingId || property.ListingKey}
                          {property.PropertyType && ` | ${property.PropertyType}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "#f9fafb",
                borderRadius: 12,
                color: "#6b7280",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                Search the MLS
              </p>
              <p style={{ fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
                Enter a city name or zip code above to search for property listings.
                Use filters to narrow your results by price, beds, baths, and more.
              </p>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {!isLoading && hasSearched && properties.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            background: "#f9fafb",
            borderRadius: 12,
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>No properties found matching your search.</p>
          <p style={{ fontSize: 14 }}>Try adjusting your filters or search a different location.</p>
        </div>
      )}

      {/* Results count */}
      {!isLoading && hasSearched && properties.length > 0 && (
        <div style={{ marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
          Showing {offset + 1}–{Math.min(offset + limit, totalCount)} of{" "}
          {totalCount.toLocaleString()} listings
        </div>
      )}

      {/* Property Cards Grid */}
      {!isLoading && properties.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {properties.map((property) => {
            const photoUrl = getPhotoUrl(property);
            const statusColor = getStatusColor(property.StandardStatus);
            const address = getAddress(property);

            return (
              <div
                key={property.ListingKey}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                }}
                onClick={() => setSelectedProperty(property)}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                {/* Photo */}
                <div
                  style={{
                    height: 200,
                    background: photoUrl ? `url(${photoUrl}) center/cover` : "#e5e7eb",
                    position: "relative",
                  }}
                >
                  {!photoUrl && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#9ca3af",
                        fontSize: 14,
                      }}
                    >
                      No Photo Available
                    </div>
                  )}
                  {/* Status badge */}
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      padding: "4px 10px",
                      background: statusColor.bg,
                      color: statusColor.text,
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {property.StandardStatus}
                  </span>
                </div>

                {/* Details */}
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                    {formatPrice(property.ListPrice)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                    {address || "Address not available"}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                    {property.City}, {property.StateOrProvince} {property.PostalCode}
                  </div>

                  {/* Specs row */}
                  <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6b7280" }}>
                    {property.BedroomsTotal != null && (
                      <span>
                        <strong>{property.BedroomsTotal}</strong> bed
                      </span>
                    )}
                    {property.BathroomsTotalInteger != null && (
                      <span>
                        <strong>{property.BathroomsTotalInteger}</strong> bath
                      </span>
                    )}
                    {property.LivingArea != null && (
                      <span>
                        <strong>{property.LivingArea.toLocaleString()}</strong> sqft
                      </span>
                    )}
                    {property.YearBuilt != null && <span>Built {property.YearBuilt}</span>}
                  </div>

                  {/* MLS # */}
                  <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
                    MLS# {property.ListingId || property.ListingKey}
                    {property.PropertyType && ` | ${property.PropertyType}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalCount > limit && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            disabled={offset === 0}
            onClick={() => searchProperties(Math.max(0, offset - limit))}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: offset === 0 ? "#f3f4f6" : "#fff",
              cursor: offset === 0 ? "not-allowed" : "pointer",
              color: offset === 0 ? "#9ca3af" : "#374151",
              fontWeight: 500,
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 14, color: "#6b7280" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={offset + limit >= totalCount}
            onClick={() => searchProperties(offset + limit)}
            style={{
              padding: "8px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: offset + limit >= totalCount ? "#f3f4f6" : "#fff",
              cursor: offset + limit >= totalCount ? "not-allowed" : "pointer",
              color: offset + limit >= totalCount ? "#9ca3af" : "#374151",
              fontWeight: 500,
            }}
          >
            Next
          </button>
        </div>
      )}

        </>
      )}

      {/* My Listings Tab */}
      {activeTab === "my-listings" && (
        <div>
          {/* AI Listing Description Generator */}
          <div
            style={{
              background: showDescGen ? "#fff" : "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
              border: showDescGen ? "2px solid #8b5cf6" : "1px solid #e5e7eb",
              borderRadius: 12,
              padding: showDescGen ? 24 : 20,
              marginBottom: 24,
            }}
          >
            {!showDescGen ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#374151" }}>
                    AI Listing Description Generator
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    Enter property details and get 3 ready-to-use, Fair Housing compliant descriptions.
                  </p>
                </div>
                <button
                  onClick={() => setShowDescGen(true)}
                  style={{
                    padding: "10px 24px",
                    background: "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  Generate Description
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#374151" }}>
                    Generate Listing Description
                  </h3>
                  <button
                    onClick={() => { setShowDescGen(false); setDescResults(null); setDescError(""); }}
                    style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}
                  >
                    &times;
                  </button>
                </div>

                {/* Compliance notice */}
                <div style={{
                  padding: "10px 14px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  marginBottom: 20,
                  fontSize: 12,
                  color: "#166534",
                  lineHeight: 1.5,
                }}>
                  All generated descriptions are NAR and Fair Housing Act compliant. Always review before posting to your MLS.
                </div>

                {/* Form */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                      Property Type <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={descForm.propertyType}
                      onChange={(e) => setDescForm({ ...descForm, propertyType: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
                    >
                      <option>Single Family Residential</option>
                      <option>Condo</option>
                      <option>Townhouse</option>
                      <option>Multi-Family</option>
                      <option>Land</option>
                      <option>Commercial</option>
                      <option>Farm / Ranch</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                      Bedrooms <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number" min="0" placeholder="3"
                      value={descForm.bedrooms}
                      onChange={(e) => setDescForm({ ...descForm, bedrooms: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                      Bathrooms <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number" min="0" step="0.5" placeholder="2"
                      value={descForm.bathrooms}
                      onChange={(e) => setDescForm({ ...descForm, bathrooms: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                      Square Feet <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number" min="0" placeholder="2000"
                      value={descForm.sqft}
                      onChange={(e) => setDescForm({ ...descForm, sqft: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                      Year Built
                    </label>
                    <input
                      type="number" min="1800" max="2030" placeholder="2005"
                      value={descForm.yearBuilt}
                      onChange={(e) => setDescForm({ ...descForm, yearBuilt: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374141" }}>
                      Lot Size
                    </label>
                    <input
                      type="text" placeholder="0.25 acres"
                      value={descForm.lotSize}
                      onChange={(e) => setDescForm({ ...descForm, lotSize: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                      Architectural Style
                    </label>
                    <select
                      value={descForm.architecturalStyle}
                      onChange={(e) => setDescForm({ ...descForm, architecturalStyle: e.target.value })}
                      style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}
                    >
                      <option value="">Not specified</option>
                      <option>Ranch</option>
                      <option>Colonial</option>
                      <option>Cape Cod</option>
                      <option>Craftsman</option>
                      <option>Contemporary</option>
                      <option>Mid-Century Modern</option>
                      <option>Victorian</option>
                      <option>Tudor</option>
                      <option>Mediterranean</option>
                      <option>Spanish</option>
                      <option>Farmhouse</option>
                      <option>Split Level</option>
                      <option>A-Frame</option>
                      <option>Log Home</option>
                    </select>
                  </div>
                </div>

                {/* Feature checkboxes */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                    Key Features (check all that apply)
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                    {PROPERTY_FEATURES.map((feature) => (
                      <label
                        key={feature}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          color: "#374151",
                          cursor: "pointer",
                          padding: "4px 0",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={descFeatures.includes(feature)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDescFeatures([...descFeatures, feature]);
                            } else {
                              setDescFeatures(descFeatures.filter((f) => f !== feature));
                            }
                          }}
                          style={{ width: 16, height: 16, accentColor: "#8b5cf6" }}
                        />
                        {feature}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional notes */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
                    Additional Notes (optional)
                  </label>
                  <textarea
                    value={descForm.additionalNotes}
                    onChange={(e) => setDescForm({ ...descForm, additionalNotes: e.target.value })}
                    placeholder="E.g., recently renovated kitchen, new HVAC, backs up to greenbelt, corner lot..."
                    rows={2}
                    style={{
                      width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6,
                      fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Generate button */}
                <button
                  onClick={async () => {
                    if (!descForm.bedrooms || !descForm.bathrooms || !descForm.sqft) {
                      setDescError("Please fill in bedrooms, bathrooms, and square footage.");
                      return;
                    }
                    setDescLoading(true);
                    setDescError("");
                    setDescResults(null);
                    setCopiedIdx(null);
                    try {
                      const res = await fetch("/api/mls/generate-description", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          propertyType: descForm.propertyType,
                          bedrooms: Number(descForm.bedrooms),
                          bathrooms: Number(descForm.bathrooms),
                          sqft: Number(descForm.sqft),
                          yearBuilt: descForm.yearBuilt ? Number(descForm.yearBuilt) : undefined,
                          lotSize: descForm.lotSize || undefined,
                          architecturalStyle: descForm.architecturalStyle || undefined,
                          features: descFeatures.length > 0 ? descFeatures : undefined,
                          additionalNotes: descForm.additionalNotes || undefined,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok || !data.success) {
                        setDescError(data.error || "Failed to generate descriptions.");
                      } else {
                        setDescResults(data.descriptions);
                      }
                    } catch (err: any) {
                      setDescError(err.message || "Something went wrong.");
                    } finally {
                      setDescLoading(false);
                    }
                  }}
                  disabled={descLoading}
                  style={{
                    width: "100%",
                    padding: "12px 24px",
                    background: descLoading ? "#a78bfa" : "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: descLoading ? "wait" : "pointer",
                    fontSize: 15,
                    marginBottom: descResults || descError ? 20 : 0,
                  }}
                >
                  {descLoading ? "Generating descriptions..." : "Generate Descriptions"}
                </button>

                {/* Error */}
                {descError && (
                  <div style={{
                    padding: 12, background: "#fee2e2", color: "#dc2626",
                    borderRadius: 8, marginBottom: 16, fontSize: 14,
                  }}>
                    {descError}
                  </div>
                )}

                {/* Results */}
                {descResults && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {descResults.map((variant, idx) => (
                      <div
                        key={variant.tone}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 16px",
                          background: idx === 0 ? "#eff6ff" : idx === 1 ? "#fef3c7" : "#f5f3ff",
                        }}>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: idx === 0 ? "#1d4ed8" : idx === 1 ? "#b45309" : "#7c3aed",
                          }}>
                            {variant.label}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(variant.description);
                              setCopiedIdx(idx);
                              setTimeout(() => setCopiedIdx(null), 2000);
                            }}
                            style={{
                              padding: "5px 14px",
                              background: copiedIdx === idx ? "#10b981" : "#fff",
                              color: copiedIdx === idx ? "#fff" : "#374151",
                              border: copiedIdx === idx ? "none" : "1px solid #d1d5db",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {copiedIdx === idx ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div style={{ padding: 16, fontSize: 14, lineHeight: 1.7, color: "#374151" }}>
                          {variant.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Existing Listings Grid */}
          {isLoadingMyListings ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              Loading your listings...
            </div>
          ) : myListings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "#f9fafb",
                borderRadius: 12,
                color: "#6b7280",
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                No Listings Yet
              </p>
              <p style={{ fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
                Your listings from the MLS will appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {myListings.map((listing) => {
                const photoUrl = getMyListingPhoto(listing);
                const statusColor = getStatusColor(listing.status as string);
                const address = getMyListingAddress(listing);

                return (
                  <div
                    key={listing.id as string}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      overflow: "hidden",
                      transition: "box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div
                      style={{
                        height: 180,
                        background: photoUrl ? `url(${photoUrl}) center/cover` : "#e5e7eb",
                        position: "relative",
                      }}
                    >
                      {!photoUrl && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#9ca3af",
                            fontSize: 14,
                          }}
                        >
                          No Photo
                        </div>
                      )}
                      <span
                        style={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                          padding: "4px 10px",
                          background: statusColor.bg,
                          color: statusColor.text,
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {listing.status as string}
                      </span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                        {formatPrice(listing.list_price as number)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 4 }}>
                        {address || "Address not set"}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                        {listing.city as string}, {listing.state_or_province as string} {listing.postal_code as string}
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6b7280" }}>
                        {listing.bedrooms_total != null && (
                          <span><strong>{listing.bedrooms_total as number}</strong> bed</span>
                        )}
                        {listing.bathrooms_total != null && (
                          <span><strong>{listing.bathrooms_total as number}</strong> bath</span>
                        )}
                        {listing.living_area != null && (
                          <span><strong>{(listing.living_area as number).toLocaleString()}</strong> sqft</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Property Detail Modal */}
      {selectedProperty && (
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
            padding: "40px 16px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProperty(null);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 700,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header Photo */}
            {(() => {
              const photoUrl = getPhotoUrl(selectedProperty);
              return photoUrl ? (
                <div style={{ height: 300, background: `url(${photoUrl}) center/cover`, borderRadius: "16px 16px 0 0" }} />
              ) : (
                <div
                  style={{
                    height: 200,
                    background: "#e5e7eb",
                    borderRadius: "16px 16px 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                  }}
                >
                  No Photo Available
                </div>
              );
            })()}

            <div style={{ padding: 24 }}>
              {/* Close button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>
                    ${selectedProperty.ListPrice?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#374151", marginTop: 4 }}>
                    {getAddress(selectedProperty)}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>
                    {selectedProperty.City}, {selectedProperty.StateOrProvince}{" "}
                    {selectedProperty.PostalCode}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  style={{
                    padding: "6px 12px",
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

              {/* Status badge */}
              {(() => {
                const statusColor = getStatusColor(selectedProperty.StandardStatus);
                return (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      background: statusColor.bg,
                      color: statusColor.text,
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 16,
                    }}
                  >
                    {selectedProperty.StandardStatus}
                  </span>
                );
              })()}

              {/* Specs Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  gap: 12,
                  padding: 16,
                  background: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                {selectedProperty.BedroomsTotal != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedProperty.BedroomsTotal}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Bedrooms</div>
                  </div>
                )}
                {selectedProperty.BathroomsTotalInteger != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedProperty.BathroomsTotalInteger}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Bathrooms</div>
                  </div>
                )}
                {selectedProperty.LivingArea != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      {selectedProperty.LivingArea.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Sq Ft</div>
                  </div>
                )}
                {selectedProperty.YearBuilt != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedProperty.YearBuilt}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Year Built</div>
                  </div>
                )}
                {selectedProperty.LotSizeArea != null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      {selectedProperty.LotSizeArea.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Lot Size</div>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 12px" }}>
                  <span style={{ fontWeight: 600, color: "#374151" }}>MLS #:</span>
                  <span style={{ color: "#6b7280" }}>
                    {selectedProperty.ListingId || selectedProperty.ListingKey}
                  </span>
                  <span style={{ fontWeight: 600, color: "#374151" }}>Property Type:</span>
                  <span style={{ color: "#6b7280" }}>
                    {selectedProperty.PropertyType}
                    {selectedProperty.PropertySubType ? ` - ${selectedProperty.PropertySubType}` : ""}
                  </span>
                  {selectedProperty.ListAgentFullName && (
                    <>
                      <span style={{ fontWeight: 600, color: "#374151" }}>Listing Agent:</span>
                      <span style={{ color: "#6b7280" }}>{selectedProperty.ListAgentFullName}</span>
                    </>
                  )}
                  {selectedProperty.ListOfficeName && (
                    <>
                      <span style={{ fontWeight: 600, color: "#374151" }}>Office:</span>
                      <span style={{ color: "#6b7280" }}>{selectedProperty.ListOfficeName}</span>
                    </>
                  )}
                  {selectedProperty.OnMarketDate && (
                    <>
                      <span style={{ fontWeight: 600, color: "#374151" }}>On Market:</span>
                      <span style={{ color: "#6b7280" }}>
                        {new Date(selectedProperty.OnMarketDate).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {selectedProperty.PublicRemarks && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                    Description
                  </h4>
                  <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                    {selectedProperty.PublicRemarks}
                  </p>
                </div>
              )}

              {/* Media gallery thumbnails */}
              {selectedProperty.Media && selectedProperty.Media.length > 1 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#374151" }}>
                    Photos ({selectedProperty.Media.length})
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      overflowX: "auto",
                      paddingBottom: 8,
                    }}
                  >
                    {selectedProperty.Media.sort((a, b) => (a.Order || 0) - (b.Order || 0)).map(
                      (media) => (
                        <img
                          key={media.MediaKey}
                          src={media.MediaURL}
                          alt={media.ShortDescription || "Property photo"}
                          style={{
                            width: 120,
                            height: 80,
                            objectFit: "cover",
                            borderRadius: 6,
                            flexShrink: 0,
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  paddingTop: 16,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openSendModal(selectedProperty, "email");
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Send to Contact
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openSendModal(selectedProperty, "attach");
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  Attach to Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send to Contact Modal */}
      {showSendModal && sendProperty && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 60,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSendModal(false);
              setSendProperty(null);
            }
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                {sendMode === "email" ? "Send Listing to Contact" : "Attach Listing to Contact"}
              </h3>
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSendProperty(null);
                }}
                style={{
                  padding: "4px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Property being sent */}
            <div
              style={{
                padding: 12,
                background: "#f9fafb",
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                ${sendProperty.ListPrice?.toLocaleString()} — {getAddress(sendProperty)}
              </div>
              <div style={{ color: "#6b7280" }}>
                {sendProperty.City}, {sendProperty.StateOrProvince} |{" "}
                MLS# {sendProperty.ListingId || sendProperty.ListingKey}
              </div>
            </div>

            {/* Success/Error Result */}
            {sendResult && (
              <div
                style={{
                  padding: 12,
                  background: sendResult.success ? "#dcfce7" : "#fee2e2",
                  color: sendResult.success ? "#16a34a" : "#dc2626",
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 14,
                }}
              >
                {sendResult.message}
              </div>
            )}

            {/* Contact search */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Search contacts by name, email, or phone..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>

            {/* Contact error */}
            {contactError && (
              <div style={{
                padding: 12, background: "#fee2e2", color: "#dc2626",
                borderRadius: 8, marginBottom: 12, fontSize: 13,
              }}>
                {contactError}
              </div>
            )}

            {/* Contacts list */}
            {isLoadingContacts ? (
              <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 14 }}>
                Loading contacts...
              </div>
            ) : contacts.length === 0 && !contactError ? (
              <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 14 }}>
                {contactSearch
                  ? "No contacts found. Try a different search."
                  : sendMode === "email"
                    ? "Search for a contact to send this listing to."
                    : "Search for a contact to attach this listing to."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {getContactDisplayName(contact)}
                      </div>
                      {contact.email && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{contact.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => sendToContact(contact.id)}
                      disabled={sendingContactId !== ""}
                      style={{
                        padding: "6px 14px",
                        background: sendMode === "email" ? "#3b82f6" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: sendingContactId !== "" ? "wait" : "pointer",
                        opacity: sendingContactId !== "" ? 0.7 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {sendingContactId === contact.id
                        ? (sendMode === "email" ? "Sending..." : "Attaching...")
                        : (sendMode === "email" ? "Send" : "Attach")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
