"use client";

import { useState, useMemo } from "react";

interface MortgageInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  pmiRate: number;
  includePmi: boolean;
}

interface AffordabilityInputs {
  monthlyBudget: number;
  interestRate: number;
  loanTermYears: number;
  downPaymentPercent: number;
  propertyTaxRate: number;
  insuranceRate: number;
  hoaMonthly: number;
  includePmi: boolean;
  pmiRate: number;
}

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  totalInterest: number;
  totalPrincipal: number;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDecimal = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {prefix && <span style={{ fontSize: 14, color: "#6b7280" }}>{prefix}</span>}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step || 1}
          min={min}
          max={max}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            outline: "none",
          }}
        />
        {suffix && <span style={{ fontSize: 14, color: "#6b7280" }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function PublicMortgageCalculator({
  agentName,
  agentPhone,
}: {
  agentName: string;
  agentPhone?: string;
}) {
  const [inputs, setInputs] = useState<MortgageInputs>({
    purchasePrice: 400000,
    downPaymentPercent: 20,
    downPaymentAmount: 80000,
    interestRate: 6.5,
    loanTermYears: 30,
    propertyTaxAnnual: 4800,
    insuranceAnnual: 1800,
    hoaMonthly: 0,
    pmiRate: 0.5,
    includePmi: false,
  });

  const [showAmortization, setShowAmortization] = useState(false);
  const [usePercentDownPayment, setUsePercentDownPayment] = useState(true);
  const [activeTab, setActiveTab] = useState<"calculator" | "affordability">("calculator");

  const [affordInputs, setAffordInputs] = useState<AffordabilityInputs>({
    monthlyBudget: 3000,
    interestRate: 6.5,
    loanTermYears: 30,
    downPaymentPercent: 20,
    propertyTaxRate: 1.2,
    insuranceRate: 0.5,
    hoaMonthly: 0,
    includePmi: false,
    pmiRate: 0.5,
  });

  const handleInputChange = (field: keyof MortgageInputs, value: number | boolean) => {
    setInputs((prev) => {
      const newInputs = { ...prev, [field]: value };

      if (field === "purchasePrice") {
        if (usePercentDownPayment) {
          newInputs.downPaymentAmount = (value as number) * (prev.downPaymentPercent / 100);
        } else {
          newInputs.downPaymentPercent = (prev.downPaymentAmount / (value as number)) * 100;
        }
      } else if (field === "downPaymentPercent") {
        newInputs.downPaymentAmount = prev.purchasePrice * ((value as number) / 100);
      } else if (field === "downPaymentAmount") {
        newInputs.downPaymentPercent = ((value as number) / prev.purchasePrice) * 100;
      }

      // Auto-enable PMI if down payment < 20%
      if (field === "downPaymentPercent" || field === "downPaymentAmount" || field === "purchasePrice") {
        newInputs.includePmi = newInputs.downPaymentPercent < 20;
      }

      return newInputs;
    });
  };

  // ─── PITI Calculation ─────────────────────────────────────────

  const results = useMemo(() => {
    const loanAmount = inputs.purchasePrice - inputs.downPaymentAmount;
    const monthlyRate = inputs.interestRate / 100 / 12;
    const numPayments = inputs.loanTermYears * 12;

    let monthlyPI = 0;
    if (monthlyRate > 0 && numPayments > 0) {
      monthlyPI =
        (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else if (numPayments > 0) {
      monthlyPI = loanAmount / numPayments;
    }

    const monthlyTax = inputs.propertyTaxAnnual / 12;
    const monthlyInsurance = inputs.insuranceAnnual / 12;
    const monthlyPMI = inputs.includePmi ? (loanAmount * (inputs.pmiRate / 100)) / 12 : 0;

    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + inputs.hoaMonthly + monthlyPMI;
    const totalInterest = monthlyPI * numPayments - loanAmount;

    return {
      loanAmount,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      monthlyHOA: inputs.hoaMonthly,
      totalMonthly,
      totalInterest,
      totalCost:
        monthlyPI * numPayments +
        inputs.propertyTaxAnnual * inputs.loanTermYears +
        inputs.insuranceAnnual * inputs.loanTermYears +
        inputs.hoaMonthly * numPayments +
        monthlyPMI * numPayments,
    };
  }, [inputs]);

  // ─── Amortization Schedule ────────────────────────────────────

  const amortization = useMemo(() => {
    if (!showAmortization) return [];

    const rows: AmortizationRow[] = [];
    const monthlyRate = inputs.interestRate / 100 / 12;
    let balance = results.loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;

    for (let month = 1; month <= inputs.loanTermYears * 12; month++) {
      const interest = balance * monthlyRate;
      const principal = results.monthlyPI - interest;
      balance -= principal;
      totalInterest += interest;
      totalPrincipal += principal;

      rows.push({
        month,
        payment: results.monthlyPI,
        principal,
        interest,
        balance: Math.max(0, balance),
        totalInterest,
        totalPrincipal,
      });
    }

    return rows;
  }, [showAmortization, inputs, results]);

  // ─── Affordability Calculation ────────────────────────────────

  const affordability = useMemo(() => {
    const {
      monthlyBudget,
      interestRate,
      loanTermYears,
      downPaymentPercent,
      propertyTaxRate,
      insuranceRate,
      hoaMonthly,
      includePmi,
      pmiRate,
    } = affordInputs;

    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTermYears * 12;

    // Work backward: budget = PI + tax + insurance + HOA + PMI
    // Tax = homeValue * taxRate / 12
    // Insurance = homeValue * insuranceRate / 12
    // PMI = loanAmount * pmiRate / 12 = homeValue * (1-dp%) * pmiRate / 12
    // PI = loanAmount * [r(1+r)^n] / [(1+r)^n - 1]
    // loanAmount = homeValue * (1 - dp%)

    // Let H = home value, dp = downPaymentPercent/100
    // budget = H*(1-dp) * [r(1+r)^n / ((1+r)^n - 1)] + H*taxRate/1200 + H*insuranceRate/1200 + HOA + (includePmi ? H*(1-dp)*pmiRate/1200 : 0)
    // budget - HOA = H * [ (1-dp) * mortgageFactor + taxRate/1200 + insuranceRate/1200 + (includePmi ? (1-dp)*pmiRate/1200 : 0) ]

    const dp = downPaymentPercent / 100;
    let mortgageFactor = 0;
    if (monthlyRate > 0) {
      mortgageFactor =
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else if (numPayments > 0) {
      mortgageFactor = 1 / numPayments;
    }

    const piPerDollar = (1 - dp) * mortgageFactor;
    const taxPerDollar = propertyTaxRate / 1200;
    const insPerDollar = insuranceRate / 1200;
    const pmiPerDollar = includePmi ? ((1 - dp) * pmiRate) / 1200 : 0;

    const totalPerDollar = piPerDollar + taxPerDollar + insPerDollar + pmiPerDollar;
    const availableForHousing = monthlyBudget - hoaMonthly;

    const maxHomePrice = totalPerDollar > 0 ? availableForHousing / totalPerDollar : 0;
    const downPaymentNeeded = maxHomePrice * dp;
    const loanAmount = maxHomePrice * (1 - dp);
    const monthlyPI = loanAmount * mortgageFactor;

    return {
      maxHomePrice: Math.max(0, maxHomePrice),
      downPaymentNeeded: Math.max(0, downPaymentNeeded),
      loanAmount: Math.max(0, loanAmount),
      monthlyPI,
      monthlyTax: maxHomePrice * taxPerDollar,
      monthlyInsurance: maxHomePrice * insPerDollar,
      monthlyPMI: maxHomePrice * pmiPerDollar,
    };
  }, [affordInputs]);

  // ─── PITI Pie Chart (CSS-only) ────────────────────────────────

  const pitiBreakdown = [
    { label: "Principal & Interest", amount: results.monthlyPI, color: "#3b82f6" },
    { label: "Property Tax", amount: results.monthlyTax, color: "#10b981" },
    { label: "Insurance", amount: results.monthlyInsurance, color: "#f59e0b" },
    { label: "HOA", amount: results.monthlyHOA, color: "#8b5cf6" },
    ...(results.monthlyPMI > 0 ? [{ label: "PMI", amount: results.monthlyPMI, color: "#ef4444" }] : []),
  ];

  const total = pitiBreakdown.reduce((s, b) => s + b.amount, 0);

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div>
      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        {(["calculator", "affordability"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              background: activeTab === tab ? "#3b82f6" : "white",
              color: activeTab === tab ? "white" : "#374151",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tab === "calculator" ? "Payment Calculator" : "Affordability"}
          </button>
        ))}
      </div>

      {activeTab === "calculator" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left: Inputs */}
          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Loan Details</h3>

            <InputField
              label="Purchase Price"
              value={inputs.purchasePrice}
              onChange={(v) => handleInputChange("purchasePrice", v)}
              prefix="$"
              step={5000}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <InputField
                  label="Down Payment"
                  value={usePercentDownPayment ? inputs.downPaymentPercent : inputs.downPaymentAmount}
                  onChange={(v) =>
                    handleInputChange(usePercentDownPayment ? "downPaymentPercent" : "downPaymentAmount", v)
                  }
                  prefix={usePercentDownPayment ? undefined : "$"}
                  suffix={usePercentDownPayment ? "%" : undefined}
                  step={usePercentDownPayment ? 1 : 5000}
                />
              </div>
              <button
                onClick={() => setUsePercentDownPayment(!usePercentDownPayment)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                  cursor: "pointer",
                  fontSize: 12,
                  marginBottom: 16,
                  whiteSpace: "nowrap",
                }}
              >
                {usePercentDownPayment ? "Use $" : "Use %"}
              </button>
            </div>

            <InputField
              label="Interest Rate"
              value={inputs.interestRate}
              onChange={(v) => handleInputChange("interestRate", v)}
              suffix="%"
              step={0.125}
            />

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>
                Loan Term
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[30, 20, 15, 10].map((term) => (
                  <button
                    key={term}
                    onClick={() => handleInputChange("loanTermYears", term)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: inputs.loanTermYears === term ? "2px solid #3b82f6" : "1px solid #d1d5db",
                      borderRadius: 8,
                      background: inputs.loanTermYears === term ? "#eff6ff" : "white",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: inputs.loanTermYears === term ? 600 : 400,
                    }}
                  >
                    {term}yr
                  </button>
                ))}
              </div>
            </div>

            <InputField
              label="Annual Property Tax"
              value={inputs.propertyTaxAnnual}
              onChange={(v) => handleInputChange("propertyTaxAnnual", v)}
              prefix="$"
              step={100}
            />

            <InputField
              label="Annual Insurance"
              value={inputs.insuranceAnnual}
              onChange={(v) => handleInputChange("insuranceAnnual", v)}
              prefix="$"
              step={100}
            />

            <InputField
              label="Monthly HOA"
              value={inputs.hoaMonthly}
              onChange={(v) => handleInputChange("hoaMonthly", v)}
              prefix="$"
              step={25}
            />

            {inputs.includePmi && (
              <InputField
                label="PMI Rate (annual)"
                value={inputs.pmiRate}
                onChange={(v) => handleInputChange("pmiRate", v)}
                suffix="%"
                step={0.1}
              />
            )}
          </div>

          {/* Right: Results */}
          <div>
            {/* Monthly Payment Summary */}
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 4px" }}>Estimated Monthly Payment</p>
              <p style={{ fontSize: 36, fontWeight: 800, margin: "0 0 16px", color: "#111827" }}>
                {fmt(results.totalMonthly)}
              </p>

              {/* PITI Breakdown */}
              {pitiBreakdown.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: item.color,
                      }}
                    />
                    <span style={{ fontSize: 13, color: "#374151" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtDecimal(item.amount)}</span>
                </div>
              ))}

              {/* Percentage bar */}
              <div
                style={{
                  display: "flex",
                  height: 8,
                  borderRadius: 4,
                  overflow: "hidden",
                  marginTop: 16,
                }}
              >
                {pitiBreakdown.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      width: `${(item.amount / total) * 100}%`,
                      background: item.color,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Loan Summary */}
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Loan Summary</h4>
              {[
                ["Loan Amount", fmt(results.loanAmount)],
                ["Down Payment", `${fmt(inputs.downPaymentAmount)} (${inputs.downPaymentPercent.toFixed(1)}%)`],
                ["Total Interest", fmt(results.totalInterest)],
                ["Total Cost", fmt(results.totalCost)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Amortization Toggle */}
            <button
              onClick={() => setShowAmortization(!showAmortization)}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "white",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {showAmortization ? "Hide" : "Show"} Amortization Schedule
            </button>

            {/* CTA */}
            {agentPhone && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#eff6ff",
                  borderRadius: 12,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 8px" }}>Ready to get pre-approved?</p>
                <a
                  href={`tel:${agentPhone}`}
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    background: "#3b82f6",
                    color: "white",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Call {agentName}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── Affordability Tab ──────────────────────────────────── */
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left: Inputs */}
          <div
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>What Can You Afford?</h3>

            <InputField
              label="Monthly Budget for Housing"
              value={affordInputs.monthlyBudget}
              onChange={(v) => setAffordInputs((p) => ({ ...p, monthlyBudget: v }))}
              prefix="$"
              step={100}
            />

            <InputField
              label="Interest Rate"
              value={affordInputs.interestRate}
              onChange={(v) => setAffordInputs((p) => ({ ...p, interestRate: v }))}
              suffix="%"
              step={0.125}
            />

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>
                Loan Term
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[30, 20, 15].map((term) => (
                  <button
                    key={term}
                    onClick={() => setAffordInputs((p) => ({ ...p, loanTermYears: term }))}
                    style={{
                      flex: 1,
                      padding: "8px",
                      border: affordInputs.loanTermYears === term ? "2px solid #3b82f6" : "1px solid #d1d5db",
                      borderRadius: 8,
                      background: affordInputs.loanTermYears === term ? "#eff6ff" : "white",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: affordInputs.loanTermYears === term ? 600 : 400,
                    }}
                  >
                    {term}yr
                  </button>
                ))}
              </div>
            </div>

            <InputField
              label="Down Payment"
              value={affordInputs.downPaymentPercent}
              onChange={(v) => setAffordInputs((p) => ({ ...p, downPaymentPercent: v, includePmi: v < 20 }))}
              suffix="%"
              step={1}
            />

            <InputField
              label="Property Tax Rate"
              value={affordInputs.propertyTaxRate}
              onChange={(v) => setAffordInputs((p) => ({ ...p, propertyTaxRate: v }))}
              suffix="% / yr"
              step={0.1}
            />

            <InputField
              label="Insurance Rate"
              value={affordInputs.insuranceRate}
              onChange={(v) => setAffordInputs((p) => ({ ...p, insuranceRate: v }))}
              suffix="% / yr"
              step={0.1}
            />

            <InputField
              label="Monthly HOA"
              value={affordInputs.hoaMonthly}
              onChange={(v) => setAffordInputs((p) => ({ ...p, hoaMonthly: v }))}
              prefix="$"
              step={25}
            />
          </div>

          {/* Right: Results */}
          <div>
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 4px" }}>Maximum Home Price</p>
              <p style={{ fontSize: 36, fontWeight: 800, margin: "0 0 24px", color: "#10b981" }}>
                {fmt(affordability.maxHomePrice)}
              </p>

              {[
                ["Down Payment Needed", fmt(affordability.downPaymentNeeded)],
                ["Loan Amount", fmt(affordability.loanAmount)],
                ["Monthly P&I", fmtDecimal(affordability.monthlyPI)],
                ["Monthly Tax", fmtDecimal(affordability.monthlyTax)],
                ["Monthly Insurance", fmtDecimal(affordability.monthlyInsurance)],
                ...(affordability.monthlyPMI > 0 ? [["Monthly PMI", fmtDecimal(affordability.monthlyPMI)]] : []),
                ["Monthly HOA", fmtDecimal(affordInputs.hoaMonthly)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0 0",
                  fontWeight: 700,
                }}
              >
                <span style={{ fontSize: 14 }}>Total Monthly</span>
                <span style={{ fontSize: 14 }}>{fmtDecimal(affordInputs.monthlyBudget)}</span>
              </div>
            </div>

            {/* CTA */}
            {agentPhone && (
              <div
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#ecfdf5",
                  borderRadius: 12,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 8px" }}>Want to start your home search?</p>
                <a
                  href={`tel:${agentPhone}`}
                  style={{
                    display: "inline-block",
                    padding: "10px 24px",
                    background: "#10b981",
                    color: "white",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Call {agentName}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amortization Schedule */}
      {showAmortization && activeTab === "calculator" && amortization.length > 0 && (
        <div
          style={{
            marginTop: 24,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 24,
            overflowX: "auto",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Amortization Schedule</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Month", "Payment", "Principal", "Interest", "Balance"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {amortization
                .filter((_, i) => i % 12 === 0 || i === amortization.length - 1)
                .map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>{row.month}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>{fmtDecimal(row.payment)}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>{fmtDecimal(row.principal)}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>{fmtDecimal(row.interest)}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>{fmt(row.balance)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
            Showing yearly snapshots. Full monthly schedule has {amortization.length} rows.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginTop: 24,
          lineHeight: 1.6,
          textAlign: "center",
        }}
      >
        This calculator provides estimates for informational purposes only. Actual payments may vary based on lender
        terms, credit score, and other factors. Contact a licensed mortgage professional for accurate quotes.
      </p>
    </div>
  );
}
