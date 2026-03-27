"use client";

import ExportToolbar from "../components/export-toolbar";

interface OpenHouseEvent {
  id: string;
  address: string;
  start_at: string;
  end_at: string;
  status: string;
  event_type: string;
}

export default function OpenHousesExport({ events }: { events: OpenHouseEvent[] }) {
  if (!events || events.length === 0) return null;

  return (
    <ExportToolbar
      title="Open Houses & Showings"
      columns={[
        { key: "address", label: "Address", width: 3 },
        { key: "type", label: "Type", width: 1 },
        { key: "status", label: "Status", width: 1 },
        { key: "start", label: "Start", width: 2 },
        { key: "end", label: "End", width: 2 },
      ]}
      getData={() =>
        events.map((e) => ({
          address: e.address,
          type: e.event_type === "rental" ? "Rental" : e.event_type === "both" ? "Both" : "Sales",
          status: e.status,
          start: new Date(e.start_at).toLocaleString(),
          end: new Date(e.end_at).toLocaleString(),
        }))
      }
      compact
    />
  );
}
