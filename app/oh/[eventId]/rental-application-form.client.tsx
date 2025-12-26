"use client";

import { useMemo, useState } from "react";

function toE164US(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const onlyNums = digits.replace(/\D/g, "");

  if (digits.startsWith("+")) {
    const cleaned = "+" + onlyNums;
    const len = cleaned.replace("+", "").length;
    if (len >= 8 && len <= 15) return cleaned;
    return null;
  }

  if (onlyNums.length === 10) return `+1${onlyNums}`;
  if (onlyNums.length === 11 && onlyNums.startsWith("1")) return `+${onlyNums}`;
  return null;
}

type EmploymentStatus = "employed" | "self_employed" | "retired" | "unemployed" | "student";

export default function RentalApplicationForm({
  eventId,
  pmPropertyId,
}: {
  eventId: string;
  pmPropertyId: string | null;
}) {
  // Basic Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [occupants, setOccupants] = useState("1");
  const [moveInDate, setMoveInDate] = useState("");

  // Employment
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>("employed");
  const [employerName, setEmployerName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [employmentLength, setEmploymentLength] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [employerPhone, setEmployerPhone] = useState("");

  // Current Residence
  const [currentAddress, setCurrentAddress] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [landlordPhone, setLandlordPhone] = useState("");
  const [currentRent, setCurrentRent] = useState("");
  const [reasonForMoving, setReasonForMoving] = useState("");
  const [yearsAtAddress, setYearsAtAddress] = useState("");

  // References
  const [prevLandlordName, setPrevLandlordName] = useState("");
  const [prevLandlordPhone, setPrevLandlordPhone] = useState("");
  const [reference1Name, setReference1Name] = useState("");
  const [reference1Relationship, setReference1Relationship] = useState("");
  const [reference1Phone, setReference1Phone] = useState("");
  const [reference2Name, setReference2Name] = useState("");
  const [reference2Relationship, setReference2Relationship] = useState("");
  const [reference2Phone, setReference2Phone] = useState("");

  // Additional
  const [hasPets, setHasPets] = useState(false);
  const [petInfo, setPetInfo] = useState("");
  const [hasVehicles, setHasVehicles] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Consent
  const [backgroundCheckConsent, setBackgroundCheckConsent] = useState(false);
  const [creditCheckConsent, setCreditCheckConsent] = useState(false);
  const [consentSms, setConsentSms] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const phoneE164 = useMemo(() => {
    if (!phoneInput.trim()) return null;
    return toE164US(phoneInput.trim());
  }, [phoneInput]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    // Validation
    if (!name.trim()) return setErr("Name is required.");
    if (!email.trim()) return setErr("Email is required.");
    if (!phoneE164) return setErr("Phone number is required and must be valid.");
    if (!moveInDate) return setErr("Desired move-in date is required.");

    if (employmentStatus === "employed" || employmentStatus === "self_employed") {
      if (!employerName.trim()) return setErr("Employer name is required.");
      if (!annualIncome) return setErr("Annual income is required.");
    }

    if (!currentAddress.trim()) return setErr("Current address is required.");
    if (!emergencyContactName.trim() || !emergencyContactPhone.trim()) {
      return setErr("Emergency contact information is required.");
    }

    if (!backgroundCheckConsent) {
      return setErr("Background check consent is required.");
    }
    if (!creditCheckConsent) {
      return setErr("Credit check authorization is required.");
    }

    setSubmitting(true);

    const applicationData = {
      // Basic Info
      applicant_name: name.trim(),
      applicant_email: email.trim().toLowerCase(),
      applicant_phone: phoneE164,
      number_of_occupants: parseInt(occupants) || 1,
      move_in_date: moveInDate,

      // Employment
      employment_status: employmentStatus,
      employer_name: employerName.trim() || null,
      job_title: jobTitle.trim() || null,
      employment_length: employmentLength.trim() || null,
      annual_income: annualIncome ? parseFloat(annualIncome) : null,
      employer_phone: employerPhone.trim() || null,

      // Current Residence
      current_address: currentAddress.trim(),
      landlord_name: landlordName.trim() || null,
      landlord_phone: landlordPhone.trim() || null,
      current_rent: currentRent ? parseFloat(currentRent) : null,
      reason_for_moving: reasonForMoving.trim() || null,
      years_at_address: yearsAtAddress.trim() || null,

      // References
      applicant_references: [
        prevLandlordName.trim() && prevLandlordPhone.trim()
          ? { name: prevLandlordName.trim(), phone: prevLandlordPhone.trim(), relationship: "Previous Landlord" }
          : null,
        reference1Name.trim() && reference1Phone.trim()
          ? { name: reference1Name.trim(), phone: reference1Phone.trim(), relationship: reference1Relationship.trim() || "Personal Reference" }
          : null,
        reference2Name.trim() && reference2Phone.trim()
          ? { name: reference2Name.trim(), phone: reference2Phone.trim(), relationship: reference2Relationship.trim() || "Personal Reference" }
          : null,
      ].filter(Boolean),

      // Pets & Vehicles
      pets: hasPets ? petInfo.trim() : null,
      vehicles: hasVehicles ? vehicleInfo.trim() : null,

      // Emergency Contact
      emergency_contact: {
        name: emergencyContactName.trim(),
        relationship: emergencyContactRelationship.trim() || "Unknown",
        phone: emergencyContactPhone.trim(),
      },

      // Consent
      credit_authorized: creditCheckConsent,
      background_check_consent: backgroundCheckConsent,
      consent_sms: consentSms,
      consent_email: consentEmail,

      // Property link
      pm_property_id: pmPropertyId,
    };

    const r = await fetch("/api/pm/applications/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId, applicationData }),
    });

    const j = await r.json().catch(() => ({}));

    setSubmitting(false);

    if (!r.ok) {
      setErr(j.error || `Submission failed (${r.status})`);
      return;
    }

    // Redirect to thank you page
    window.location.href = `/oh/${eventId}/thank-you`;
  }

  return (
    <div style={{ marginTop: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
        Rental Application
      </h2>
      <p style={{ opacity: 0.75, marginTop: 0 }}>
        Complete this application to be considered for this rental property.
      </p>

      <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 14 }}>
        {/* Basic Information */}
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
            Basic Information
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 10 }} required />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Email *</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: "100%", padding: 10 }} required />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Phone *</label>
              <input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="(808) 555-1234"
                style={{ width: "100%", padding: 10 }}
                required
              />
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                {phoneE164 ? <>Will save as: <code>{phoneE164}</code></> : <>Enter a valid phone number</>}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Number of Occupants *</label>
                <input
                  type="number"
                  min="1"
                  value={occupants}
                  onChange={(e) => setOccupants(e.target.value)}
                  style={{ width: "100%", padding: 10 }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Desired Move-In Date *</label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  style={{ width: "100%", padding: 10 }}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
            Employment Information
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Employment Status *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                style={{ width: "100%", padding: 10 }}
                required
              >
                <option value="employed">Employed</option>
                <option value="self_employed">Self-Employed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="unemployed">Unemployed</option>
              </select>
            </div>

            {(employmentStatus === "employed" || employmentStatus === "self_employed") && (
              <>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Employer Name *</label>
                  <input value={employerName} onChange={(e) => setEmployerName(e.target.value)} style={{ width: "100%", padding: 10 }} required />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Job Title</label>
                    <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Length of Employment</label>
                    <input value={employmentLength} onChange={(e) => setEmploymentLength(e.target.value)} placeholder="e.g., 2 years" style={{ width: "100%", padding: 10 }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Annual Income *</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value)}
                      placeholder="50000"
                      style={{ width: "100%", padding: 10 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Employer Phone</label>
                    <input value={employerPhone} onChange={(e) => setEmployerPhone(e.target.value)} style={{ width: "100%", padding: 10 }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Current Residence */}
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
            Current Residence
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Current Address *</label>
              <input value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} style={{ width: "100%", padding: 10 }} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Landlord/Property Manager Name</label>
                <input value={landlordName} onChange={(e) => setLandlordName(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Landlord Phone</label>
                <input value={landlordPhone} onChange={(e) => setLandlordPhone(e.target.value)} style={{ width: "100%", padding: 10 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Current Monthly Rent</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={currentRent}
                  onChange={(e) => setCurrentRent(e.target.value)}
                  placeholder="1500"
                  style={{ width: "100%", padding: 10 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Years at Current Address</label>
                <input value={yearsAtAddress} onChange={(e) => setYearsAtAddress(e.target.value)} placeholder="e.g., 2 years" style={{ width: "100%", padding: 10 }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>Reason for Moving</label>
              <textarea value={reasonForMoving} onChange={(e) => setReasonForMoving(e.target.value)} rows={2} style={{ width: "100%", padding: 10 }} />
            </div>
          </div>
        </div>

        {/* References */}
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
            References
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Previous Landlord (if applicable)</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Name</label>
                  <input value={prevLandlordName} onChange={(e) => setPrevLandlordName(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Phone</label>
                  <input value={prevLandlordPhone} onChange={(e) => setPrevLandlordPhone(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Personal Reference #1</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Name</label>
                  <input value={reference1Name} onChange={(e) => setReference1Name(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Relationship</label>
                  <input value={reference1Relationship} onChange={(e) => setReference1Relationship(e.target.value)} placeholder="Friend, Colleague..." style={{ width: "100%", padding: 10 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Phone</label>
                  <input value={reference1Phone} onChange={(e) => setReference1Phone(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Personal Reference #2</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Name</label>
                  <input value={reference2Name} onChange={(e) => setReference2Name(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Relationship</label>
                  <input value={reference2Relationship} onChange={(e) => setReference2Relationship(e.target.value)} placeholder="Friend, Colleague..." style={{ width: "100%", padding: 10 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Phone</label>
                  <input value={reference2Phone} onChange={(e) => setReference2Phone(e.target.value)} style={{ width: "100%", padding: 10 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
            Additional Information
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>I have pets</span>
              </label>
              {hasPets && (
                <textarea
                  value={petInfo}
                  onChange={(e) => setPetInfo(e.target.value)}
                  placeholder="Type, breed, weight (e.g., Dog, Labrador, 60 lbs)"
                  rows={2}
                  style={{ width: "100%", padding: 10, marginTop: 8 }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={hasVehicles} onChange={(e) => setHasVehicles(e.target.checked)} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>I have vehicles</span>
              </label>
              {hasVehicles && (
                <textarea
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  placeholder="Make, model, license plate (e.g., Honda Accord, ABC-123)"
                  rows={2}
                  style={{ width: "100%", padding: 10, marginTop: 8 }}
                />
              )}
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Emergency Contact *</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Name</label>
                  <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} style={{ width: "100%", padding: 10 }} required />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Relationship</label>
                  <input value={emergencyContactRelationship} onChange={(e) => setEmergencyContactRelationship(e.target.value)} placeholder="Spouse, Parent..." style={{ width: "100%", padding: 10 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Phone</label>
                  <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} style={{ width: "100%", padding: 10 }} required />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consent & Authorization */}
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
            Consent & Authorization
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "start" }}>
              <input type="checkbox" checked={backgroundCheckConsent} onChange={(e) => setBackgroundCheckConsent(e.target.checked)} required />
              <span style={{ fontSize: 14 }}>
                I consent to a background check being conducted as part of this rental application. *
              </span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "start" }}>
              <input type="checkbox" checked={creditCheckConsent} onChange={(e) => setCreditCheckConsent(e.target.checked)} required />
              <span style={{ fontSize: 14 }}>
                I authorize a credit check to be performed for this rental application. *
              </span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "start" }}>
              <input type="checkbox" checked={consentEmail} onChange={(e) => setConsentEmail(e.target.checked)} />
              <span style={{ fontSize: 14 }}>
                I agree to receive emails about this application and property updates.
              </span>
            </label>

            <label style={{ display: "flex", gap: 10, alignItems: "start" }}>
              <input type="checkbox" checked={consentSms} onChange={(e) => setConsentSms(e.target.checked)} />
              <span style={{ fontSize: 14 }}>
                I agree to receive SMS messages about this application. Message/data rates may apply. Reply STOP to opt out.
              </span>
            </label>
          </div>
        </div>

        {err && (
          <div style={{ padding: 12, background: "#fee", border: "1px solid #fcc", borderRadius: 8, color: "#c00" }}>
            {err}
          </div>
        )}

        {msg && (
          <div style={{ padding: 12, background: "#efe", border: "1px solid #cfc", borderRadius: 8, color: "#060" }}>
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "12px 24px",
            background: submitting ? "#ccc" : "#4f46e5",
            color: "white",
            borderRadius: 8,
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
