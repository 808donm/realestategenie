import { Metadata } from "next";

export const metadata: Metadata = {
  title: "End User License Agreement (EULA) | Real Estate Genie",
  description: "End User License Agreement for Real Estate Genie application",
};

export default function EULAPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg">
        <div className="px-8 py-10 sm:px-12 sm:py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Real Estate Genie
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              End User License Agreement (EULA)
            </h2>
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> December 29, 2025
            </p>
          </div>

          {/* Introduction */}
          <div className="prose prose-gray max-w-none mb-8">
            <p className="text-gray-700 leading-relaxed">
              This End User License Agreement (&ldquo;<strong>Agreement</strong>&rdquo;) is a legal agreement between{" "}
              <strong>Enterprise Technology Solutions, LLC</strong>, a Hawaii limited liability company (&ldquo;<strong>Company</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>&rdquo;) and the individual or entity installing, accessing, or using the App (&ldquo;<strong>Customer</strong>,&rdquo; &ldquo;<strong>you</strong>&rdquo;).
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
              <div className="font-semibold text-gray-900 mb-2">Company Contact Information:</div>
              <div className="text-gray-700 text-sm space-y-1">
                <div>Enterprise Technology Solutions, LLC</div>
                <div>98-027 Hekaha Street, Ste 34</div>
                <div>Aiea, HI 96701</div>
                <div>Support: <a href="mailto:support@ent-techsolutions.com" className="text-blue-600 hover:text-blue-800">support@ent-techsolutions.com</a></div>
                <div>Legal Notices: <a href="mailto:support@ent-techsolutions.com" className="text-blue-600 hover:text-blue-800">support@ent-techsolutions.com</a></div>
              </div>
            </div>

            <p className="text-gray-700 leading-relaxed font-medium">
              By installing, accessing, or using the App, you agree to this Agreement. If you do not agree, do not install or use the App.
            </p>
          </div>

          <hr className="my-10 border-gray-300" />

          {/* Section 1 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Definitions</h3>
            <ul className="space-y-3 text-gray-700">
              <li>
                <strong>&ldquo;App&rdquo;</strong> means <strong>Real Estate Genie</strong>, a GoHighLevel (&ldquo;<strong>GHL</strong>&rdquo;) application, including related software, features, workflows, automations, templates, AI features, and documentation.
              </li>
              <li>
                <strong>&ldquo;GHL&rdquo;</strong> means the GoHighLevel platform and its services, APIs, and systems.
              </li>
              <li>
                <strong>&ldquo;Customer Content&rdquo;</strong> means data and content you submit to, generate with, or process through the App (including leads, contacts, messages, call metadata, notes, listing-related information, and any personal data).
              </li>
              <li>
                <strong>&ldquo;Subscription Term&rdquo;</strong> means the period (monthly or annual) for which you have paid (or are obligated to pay) applicable fees.
              </li>
              <li>
                <strong>&ldquo;Authorized Users&rdquo;</strong> means your employees/contractors who are authorized to use the App under your account.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Platform Dependency and Relationship to GHL</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The App operates <strong>only as a GHL app</strong> and depends on GHL availability and functionality. Your use of GHL is governed by your agreement(s) with GHL, not this Agreement.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are not responsible for GHL outages, API changes, feature deprecations, rate limits, or platform restrictions that impact App performance or availability.
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">3. License Grant</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Subject to this Agreement and payment of applicable fees, Company grants you a <strong>limited, non-exclusive, non-transferable, revocable</strong> license to use the App during the Subscription Term for your internal business purposes in connection with real estate lead generation, client engagement, and related workflows.
            </p>
            <p className="text-gray-700 leading-relaxed">
              All rights not expressly granted are reserved by Company.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Restrictions</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You will not (and will not allow anyone else to):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>reverse engineer, decompile, disassemble, or attempt to discover the source code or underlying ideas of the App (except to the extent prohibited by law);</li>
              <li>copy, modify, translate, or create derivative works of the App except as expressly permitted in writing;</li>
              <li>resell, sublicense, rent, lease, or provide the App to third parties as a service bureau without Company&apos;s prior written consent;</li>
              <li>bypass security controls, usage limits, authentication, or access restrictions;</li>
              <li>use the App to develop, train, benchmark, or assist in building a competing product;</li>
              <li>use the App for illegal, deceptive, abusive, harassing, discriminatory, or fraudulent activity.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">5. Account Responsibility</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>all activity under your GHL account and any credentials used with the App;</li>
              <li>maintaining accurate configurations and contact data;</li>
              <li>ensuring Authorized Users comply with this Agreement.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              You must notify Company promptly of unauthorized access or security incidents involving your App use.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">6. Communications Compliance (SMS, Email, Calling)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The App may enable you to send <strong>SMS and email</strong> on behalf of a real estate agent or real estate business.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              You agree that you (and not Company) are solely responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>obtaining and documenting lawful consent (opt-in) where required;</li>
              <li>honoring opt-out requests promptly (STOP/UNSUBSCRIBE and equivalent);</li>
              <li>message content, timing, frequency, targeting, and recipient selection;</li>
              <li>compliance with all applicable laws and rules, including <strong>TCPA</strong>, <strong>CAN-SPAM</strong>, carrier requirements, A2P messaging rules, marketing/advertising laws, and any state privacy laws.</li>
            </ul>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
              <p className="font-semibold text-gray-900 mb-2">No Spam / Abuse</p>
              <p className="text-gray-700 text-sm">
                You will not use the App to send unlawful unsolicited messages, deceptive communications, or content that violates carrier policies. Company may restrict or suspend access if your usage generates carrier complaints, deliverability issues, or legal risk.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">7. Real Estate and Fair Housing Compliance</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You acknowledge that real estate marketing and communications may be regulated and that you are responsible for compliance with applicable laws and standards, which may include fair housing rules and other real estate advertising requirements.
            </p>
            <p className="text-gray-700 leading-relaxed">
              The App is a tool. It does <strong>not</strong> guarantee compliance outcomes.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">8. AI Features and No Professional Advice</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The App uses AI features throughout the product (including analysis, suggestions, revenue improvement recommendations, neighborhood profiles, and other real-estate related functions).
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              You understand and agree:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>AI outputs may be incorrect, incomplete, biased, or outdated;</li>
              <li>you are responsible for reviewing and verifying AI-generated content before using it;</li>
              <li>the App does <strong>not</strong> provide legal advice, brokerage advice, tax advice, or other professional advice, and should not be relied upon as a substitute for professional judgment.</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Services and AI Providers</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The App may rely on third-party services (including AI providers, email/SMS delivery vendors, hosting vendors, analytics providers, and IDX providers). Your use of these services may be subject to their terms.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You authorize Company to transmit Customer Content to such vendors <strong>as necessary to provide App functionality</strong>, including AI processing, message delivery, and hosting, consistent with Company&apos;s Privacy Policy.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">10. IDX / MLS Data and Third-Party Listing Content</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              If the App provides IDX functionality or interacts with listing data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>you agree to comply with all IDX provider terms, MLS rules, licensing restrictions, and display requirements that apply to your use;</li>
              <li>listing data availability, accuracy, timeliness, and completeness are not guaranteed;</li>
              <li>Company may modify, restrict, or disable IDX-related features to comply with provider requirements or rule changes.</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">11. Customer Content; Data Storage</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Customer Content may be stored and processed in the App&apos;s <strong>hosted database</strong> and systems to deliver features, provide support, prevent abuse, and improve the App.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You represent and warrant you have all rights, permissions, and consents necessary to provide Customer Content and to allow Company to process it as described in this Agreement and Company policies.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">12. Privacy Policy and Terms</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Your use of the App is also governed by:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Terms:</strong> <a href="https://realestategenie.app/terms" className="text-blue-600 hover:text-blue-800 underline">https://realestategenie.app/terms</a></li>
              <li><strong>Privacy Policy:</strong> <a href="https://realestategenie.app/privacy" className="text-blue-600 hover:text-blue-800 underline">https://realestategenie.app/privacy</a></li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              If there is a conflict between this EULA and those documents regarding software licensing and permitted use, <strong>this EULA controls</strong>. For privacy/data handling, the <strong>Privacy Policy controls</strong>.
            </p>
          </section>

          {/* Section 13 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">13. Fees, Billing, and Refunds</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The App is offered on <strong>monthly and/or annual</strong> subscription terms (as presented at purchase).
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>No refunds.</strong> Fees are <strong>non-refundable</strong> except as required by law or explicitly agreed in writing by Company.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for all applicable taxes (excluding taxes on Company&apos;s income).
            </p>
          </section>

          {/* Section 14 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">14. Delinquency; Feature Restriction and Suspension</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              If your account becomes delinquent:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>at <strong>30 days delinquent</strong>, Company may <strong>restrict functionality</strong>; and</li>
              <li>at <strong>60 days delinquent</strong>, Company may <strong>suspend service</strong> until the account is brought current.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Company may also suspend service immediately if required by law, to prevent abuse, or to address security risk.
            </p>
          </section>

          {/* Section 15 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">15. Updates and Changes</h3>
            <p className="text-gray-700 leading-relaxed">
              Company may update the App, including adding, modifying, or removing features. We do not promise that any specific feature will remain available indefinitely.
            </p>
          </section>

          {/* Section 16 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">16. Intellectual Property</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              The App, including all software, workflows, templates, designs, and documentation, is owned by Company and/or its licensors and is protected by intellectual property laws.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Feedback.</strong> If you provide suggestions or feedback, you grant Company a perpetual, irrevocable, worldwide, royalty-free right to use it without compensation or restriction.
            </p>
          </section>

          {/* Section 17 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">17. Term and Termination</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              This Agreement begins when you first install/access/use the App and continues until terminated.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              You may terminate by discontinuing use and (if applicable) canceling your subscription through the method provided at purchase or within the platform.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Company may terminate or suspend immediately if you breach this Agreement, misuse the App, fail to pay, or create legal/security risk.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              Upon termination:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>your license ends immediately; and</li>
              <li>you must stop using the App.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              <strong>Data retention.</strong> Following termination or expiration, Company may retain Customer Content for up to <strong>180 days</strong> for backup, audit, dispute resolution, legal compliance, or recordkeeping purposes, after which Company may delete or anonymize such data in the ordinary course (unless a longer retention period is required by law, legal hold, or written agreement).
            </p>
          </section>

          {/* Section 18 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">18. Disclaimers</h3>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-gray-900 leading-relaxed font-semibold mb-2">
                THE APP IS PROVIDED <strong>&ldquo;AS IS&rdquo;</strong> AND <strong>&ldquo;AS AVAILABLE.&rdquo;</strong>
              </p>
              <p className="text-gray-700 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMPANY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              Company does not guarantee results (including leads, conversions, revenue, compliance outcomes, deliverability, or accuracy of AI outputs or IDX data).
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Not for emergency use.</strong> The App is not designed for emergency services or time-critical safety communications.
            </p>
          </section>

          {/* Section 19 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">19. Limitation of Liability</h3>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-gray-900 leading-relaxed font-semibold mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>
                  COMPANY WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION), EVEN IF ADVISED OF THE POSSIBILITY.
                </li>
                <li>
                  COMPANY&apos;S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT OR THE APP WILL NOT EXCEED <strong>THE LESSER OF</strong>:
                  <ol className="list-decimal pl-6 mt-2 space-y-1">
                    <li>THE FEES PAID BY YOU TO COMPANY FOR THE APP IN THE <strong>12 MONTHS</strong> PRIOR TO THE EVENT GIVING RISE TO THE CLAIM; OR</li>
                    <li><strong>$1,000</strong>.</li>
                  </ol>
                </li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed text-sm">
              Some jurisdictions do not allow certain limitations; in that case, liability is limited to the maximum extent permitted by law.
            </p>
          </section>

          {/* Section 20 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">20. Indemnification</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You agree to indemnify, defend, and hold harmless Company from claims, damages, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising from or related to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>your Customer Content;</li>
              <li>your communications (SMS/email), consent practices, and compliance obligations;</li>
              <li>your violation of any law or third-party terms (including IDX/MLS rules); or</li>
              <li>your breach of this Agreement.</li>
            </ul>
          </section>

          {/* Section 21 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">21. Arbitration; Class Action Waiver</h3>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-gray-900 leading-relaxed font-semibold">
                PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              Any dispute, claim, or controversy arising out of or relating to this Agreement or the App will be resolved by <strong>binding arbitration</strong> administered by <strong>JAMS</strong> under its then-current arbitration rules, on an <strong>individual basis only</strong>. Unless the parties agree otherwise, the arbitration will be conducted in <strong>Honolulu, Hawaii</strong>, and the proceedings will be conducted in English.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Fees and costs.</strong> Each party will bear its own attorneys&apos; fees and other costs related to the arbitration, except to the extent the arbitrator awards attorneys&apos; fees or costs to a party under applicable law. JAMS filing, administrative, and arbitrator fees will be paid in accordance with the applicable JAMS rules; unless those rules provide otherwise, the parties will split such fees equally, and the arbitrator may reallocate fees and costs in the final award to the extent permitted by law.
            </p>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>No class actions.</strong> You and Company agree that each may bring claims against the other only in your individual capacities, and not as a plaintiff or class member in any purported class, collective, consolidated, or representative proceeding.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Either party may seek temporary injunctive relief in court to prevent misuse of intellectual property or unauthorized access while arbitration is pending.
            </p>
          </section>

          {/* Section 22 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">22. Governing Law</h3>
            <p className="text-gray-700 leading-relaxed">
              This Agreement is governed by the laws of the <strong>State of Hawaii</strong>, without regard to conflict of laws principles.
            </p>
          </section>

          {/* Section 23 */}
          <section className="mb-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">23. Miscellaneous</h3>
            <ul className="list-disc pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Entire Agreement.</strong> This Agreement (plus the Terms and Privacy Policy referenced above) is the entire agreement between you and Company regarding the App.
              </li>
              <li>
                <strong>Severability.</strong> If any provision is unenforceable, the remaining provisions remain in effect.
              </li>
              <li>
                <strong>No Waiver.</strong> Failure to enforce any provision is not a waiver.
              </li>
              <li>
                <strong>Assignment.</strong> You may not assign this Agreement without Company&apos;s consent. Company may assign it in connection with a merger, acquisition, or sale of assets.
              </li>
              <li>
                <strong>Notices.</strong> Legal notices must be sent to: <a href="mailto:support@ent-techsolutions.com" className="text-blue-600 hover:text-blue-800 underline">support@ent-techsolutions.com</a> and the physical address listed above.
              </li>
            </ul>
          </section>

          {/* Footer */}
          <hr className="my-10 border-gray-300" />

          <div className="text-center text-sm text-gray-600">
            <p className="mb-4">
              If you have questions about this EULA, please contact us at{" "}
              <a href="mailto:support@ent-techsolutions.com" className="text-blue-600 hover:text-blue-800 underline">
                support@ent-techsolutions.com
              </a>
            </p>
            <p>
              © {new Date().getFullYear()} Enterprise Technology Solutions, LLC. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
