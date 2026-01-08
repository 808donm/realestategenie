import TenantNav from "./components/tenant-nav";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TenantNav />
      {children}
    </div>
  );
}
