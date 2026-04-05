import HazardMapClient from "../mls/hazard-map.client";

export const metadata = {
  title: "Hazard Map - Real Estate Genie",
};

export default function HazardMapPage() {
  return (
    <div>
      <HazardMapClient />
    </div>
  );
}
