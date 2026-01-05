"use client";

type GoogleMapEmbedProps = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  apiKey?: string | null;
  className?: string;
};

export default function GoogleMapEmbed({
  address,
  latitude,
  longitude,
  apiKey,
  className = "",
}: GoogleMapEmbedProps) {
  if (!apiKey) {
    return null;
  }

  const query =
    latitude != null && longitude != null
      ? `${latitude},${longitude}`
      : address;

  if (!query) {
    return null;
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
    query
  )}`;

  return (
    <div className={`relative overflow-hidden rounded-lg border ${className}`}>
      <iframe
        title={`Map for ${address}`}
        src={src}
        width="100%"
        height="100%"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        style={{ border: 0, minHeight: 250 }}
      />
    </div>
  );
}
