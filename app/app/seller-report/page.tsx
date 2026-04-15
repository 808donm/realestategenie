import SellerReportClient from "./seller-report.client";

export const metadata = {
  title: "Seller Report | The Real Estate Genie",
};

export default function SellerReportPage() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Seller Report</h1>
      <p style={{ color: "#6b7280", marginBottom: 24 }}>
        Search a property by address, review the data, and generate a professional Seller Report PDF.
      </p>
      <SellerReportClient />
    </div>
  );
}
