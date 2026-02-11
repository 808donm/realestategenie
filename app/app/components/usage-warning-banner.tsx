"use client";

import { useState } from "react";
import type { UsageAlert, SubscriptionPlan } from "@/lib/subscriptions/types";

interface UsageWarningBannerProps {
  alerts: UsageAlert[];
  plan: SubscriptionPlan;
  suggestedPlan?: SubscriptionPlan | null;
}

export default function UsageWarningBanner({ alerts, plan, suggestedPlan }: UsageWarningBannerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (activeAlerts.length === 0) {
    return null;
  }

  // Get the most severe alert type
  const hasCritical = activeAlerts.some(a => a.alert_type === 'critical_100');
  const hasWarning = activeAlerts.some(a => a.alert_type === 'warning_70');

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  // Critical (100%+) banner - Red, persistent across all pages
  if (hasCritical) {
    const criticalAlerts = activeAlerts.filter(a => a.alert_type === 'critical_100');
    const resourcesExceeded = criticalAlerts.map(a => {
      if (a.resource_type === 'agents') return 'agent';
      if (a.resource_type === 'properties') return 'property';
      return 'tenant';
    });

    return (
      <div className="bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <svg
              className="w-6 h-6 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-sm sm:text-base">
                You've exceeded your current plan's fair-use limits
              </p>
              <p className="text-sm mt-1 opacity-90">
                You've exceeded the {resourcesExceeded.join(', ')} limit
                {resourcesExceeded.length > 1 ? 's' : ''} for your <strong>{plan.name}</strong> plan.
                Nothing will stop working, but let's help you move to the right plan.
              </p>
              {suggestedPlan && (
                <div className="mt-2">
                  <a
                    href="/app/billing"
                    className="inline-flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-md font-medium text-sm hover:bg-red-50 transition-colors"
                  >
                    Upgrade to {suggestedPlan.name}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href="mailto:sales@realestategenie.app?subject=Plan Upgrade Needed"
                    className="inline-flex items-center gap-2 ml-3 text-white underline hover:no-underline text-sm"
                  >
                    Contact Sales
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Warning (70%+) banner - Yellow, dismissible
  if (hasWarning) {
    const warningAlerts = activeAlerts.filter(a => a.alert_type === 'warning_70');

    return (
      <>
        {warningAlerts.map(alert => {
          const resourceName = alert.resource_type === 'agents' ? 'agent' :
                               alert.resource_type === 'properties' ? 'property' : 'tenant';

          return (
            <div
              key={alert.id}
              className="bg-yellow-50 border-b border-yellow-200 px-4 py-3"
            >
              <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <svg
                    className="w-6 h-6 flex-shrink-0 mt-0.5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900 text-sm sm:text-base">
                      You're approaching the {resourceName} limit for your plan
                    </p>
                    <p className="text-yellow-800 text-sm mt-1">
                      You're currently using {alert.usage_count} of {alert.limit_count} {resourceName}
                      {alert.usage_count !== 1 ? 's' : ''} ({Math.round(alert.usage_percentage)}%).
                      Teams with more {resourceName}s typically upgrade to{' '}
                      {suggestedPlan ? (
                        <strong>{suggestedPlan.name}</strong>
                      ) : (
                        'a higher plan'
                      )}.
                    </p>
                    {suggestedPlan && (
                      <a
                        href="/app/billing"
                        className="inline-flex items-center gap-1 mt-2 text-yellow-900 font-medium text-sm hover:text-yellow-700 underline"
                      >
                        View upgrade options
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-yellow-600 hover:text-yellow-800 flex-shrink-0"
                  aria-label="Dismiss warning"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return null;
}
