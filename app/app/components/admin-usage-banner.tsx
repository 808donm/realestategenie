"use client";

interface AdminUsageBannerProps {
  agentName: string;
  agentEmail: string;
  agentId: string;
  exceededResources: string[];
  planName: string;
}

export default function AdminUsageBanner({
  agentName,
  agentEmail,
  agentId,
  exceededResources,
  planName
}: AdminUsageBannerProps) {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 flex-shrink-0 mt-0.5 text-blue-600"
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
          <p className="font-semibold text-blue-900 text-sm sm:text-base">
            Sales Opportunity: Customer Exceeding Plan Limits
          </p>
          <p className="text-blue-800 text-sm mt-1">
            <strong>{agentName}</strong> ({agentEmail}) has exceeded their{' '}
            <strong>{planName}</strong> plan limits for: {exceededResources.join(', ')}.
          </p>
          <div className="mt-3 flex gap-3">
            <a
              href={`mailto:${agentEmail}?subject=Let's upgrade your Real Estate Genie plan&body=Hi ${agentName},%0D%0A%0D%0AI noticed you're exceeding your current plan limits. I'd love to help you find the right plan for your growing business.%0D%0A%0D%0AWhen would be a good time for a quick call?`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Customer
            </a>
            <a
              href={`/app/admin/agents/${agentId}`}
              className="inline-flex items-center gap-2 text-blue-700 px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-100 transition-colors"
            >
              View Account Details
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
