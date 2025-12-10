"use client";

import dynamic from "next/dynamic";

// Dynamically import PropertyMap to avoid SSR issues with Leaflet
const PropertyMap = dynamic(() => import("./PropertyMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-muted animate-pulse rounded-lg min-h-[250px]" />
  ),
});

type PropertyMapWrapperProps = {
  latitude: number;
  longitude: number;
  address: string;
  className?: string;
};

export default function PropertyMapWrapper(props: PropertyMapWrapperProps) {
  return <PropertyMap {...props} />;
}
