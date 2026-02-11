"use client";

import dynamic from "next/dynamic";
import GoogleMapEmbed from "./GoogleMapEmbed";

// Dynamically import PropertyMap to avoid SSR issues with Leaflet
const PropertyMap = dynamic(() => import("./PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-muted animate-pulse rounded-lg min-h-[250px]" />
  ),
});

type PropertyMapWrapperProps = {
  latitude?: number | null;
  longitude?: number | null;
  address: string;
  googleMapsApiKey?: string | null;
  className?: string;
};

export default function PropertyMapWrapper(props: PropertyMapWrapperProps) {
  const apiKey =
    props.googleMapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    return (
      <GoogleMapEmbed
        address={props.address}
        latitude={props.latitude}
        longitude={props.longitude}
        apiKey={apiKey}
        className={props.className}
      />
    );
  }

  if (props.latitude != null && props.longitude != null) {
    return (
      <PropertyMap
        latitude={props.latitude}
        longitude={props.longitude}
        address={props.address}
        className={props.className}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
      Map not available. Add latitude/longitude or configure the Google Maps
      API key.
    </div>
  );
}
