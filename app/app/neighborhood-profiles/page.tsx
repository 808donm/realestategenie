import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import NeighborhoodProfilesClient from "./client";

export default function NeighborhoodProfilesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Neighborhood Profiles</h1>
        <p className="text-muted-foreground">
          Generate AI-powered, Fair Housing compliant neighborhood profiles for your clients.
        </p>
      </div>

      <Suspense fallback={<ProfilesSkeleton />}>
        <NeighborhoodProfilesClient />
      </Suspense>
    </div>
  );
}

function ProfilesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
