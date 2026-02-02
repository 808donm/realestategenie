"use client";

import { useState, useEffect, useRef } from "react";

interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
}

export default function ContactSearch() {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setContacts([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/ghl/contacts/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.error && data.error !== "GHL not connected") {
          setError(data.error);
        }

        setContacts(data.contacts || []);
        setShowResults(true);
      } catch (err) {
        setError("Search failed");
        setContacts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder="Search contacts..."
          className="w-full md:w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50">
              {error}
            </div>
          )}

          {!loading && contacts.length === 0 && query.length >= 2 && !error && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No contacts found
            </div>
          )}

          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <div className="font-semibold text-sm">{contact.name}</div>

              {contact.email && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-600">{contact.email}</span>
                  <button
                    onClick={() => copyToClipboard(contact.email!)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Copy email"
                  >
                    Copy
                  </button>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-600">{contact.phone}</span>
                  <button
                    onClick={() => copyToClipboard(contact.phone!)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    title="Copy phone"
                  >
                    Copy
                  </button>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    Call
                  </a>
                </div>
              )}

              {contact.tags && contact.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {contact.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {contact.tags.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{contact.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
