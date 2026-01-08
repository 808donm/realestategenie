"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface FeatureGateProps {
  hasAccess: boolean;
  featureName: string;
  children: ReactNode;
  showUpgrade?: boolean;
  upgradeMessage?: string;
}

/**
 * Feature gate component that greys out UI for features not in the user's plan
 * Does not remove features, just makes them visually disabled and unclickable
 */
export function FeatureGate({
  hasAccess,
  featureName,
  children,
  showUpgrade = true,
  upgradeMessage
}: FeatureGateProps) {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Greyed out content */}
      <div
        className="pointer-events-none select-none opacity-40 filter grayscale"
        aria-disabled="true"
      >
        {children}
      </div>

      {/* Upgrade overlay */}
      {showUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center px-4 py-6 max-w-sm">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h3 className="font-semibold text-gray-900 mb-2">
              {featureName}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {upgradeMessage || `Upgrade your plan to access ${featureName}`}
            </p>
            <Link
              href="/app/billing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View Plans
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple feature gate for inline use (no overlay, just opacity)
 */
export function InlineFeatureGate({
  hasAccess,
  children
}: {
  hasAccess: boolean;
  children: ReactNode;
}) {
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="opacity-50 pointer-events-none select-none filter grayscale">
      {children}
    </div>
  );
}

/**
 * Feature badge to show upgrade required
 */
export function UpgradeBadge({ planName }: { planName?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      {planName ? `${planName} Required` : 'Upgrade Required'}
    </span>
  );
}
