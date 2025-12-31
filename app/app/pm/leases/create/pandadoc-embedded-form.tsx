"use client";

import { useEffect, useRef } from "react";

interface PandaDocEmbeddedFormProps {
  leaseData: {
    // Contract
    contractDate: string;

    // Landlord
    landlordFirstName: string;
    landlordLastName: string;
    landlordEmail: string;

    // Tenant
    tenantFirstName: string;
    tenantLastName: string;
    tenantEmail: string;
    tenantPhone: string;

    // Property
    propertyStreetAddress: string;
    propertyUnitNumber: string;
    propertyCity: string;
    propertyState: string;
    propertyZipcode: string;

    // Lease Terms
    leaseStartDate: string;
    leaseEndDate: string;
    leaseMonthlyRent: string;
    leaseRentDueDay: string;
    leaseSecurityDeposit: string;
    leasePetDeposit: string;
    leaseNoticePeriodDays: string;
    leaseMoveOutRequirements: string;
  };
  onLoaded?: () => void;
  onStarted?: (data: any) => void;
  onCompleted?: (data: any) => void;
  onException?: (data: any) => void;
  height?: string;
}

export default function PandaDocEmbeddedForm({
  leaseData,
  onLoaded,
  onStarted,
  onCompleted,
  onException,
  height = "700px",
}: PandaDocEmbeddedFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing iframe
    containerRef.current.innerHTML = "";

    const config = {
      nodeId: "pandadoc-form-container",
      width: "100%",
      height: height,
      url: "https://eform.pandadoc.com/?eform=d7795abe-9de8-44f8-81dd-05879ce93824",
      events: {
        loaded: () => {
          console.log("PandaDoc form loaded");
          onLoaded?.();
        },
        started: (data: any) => {
          console.log("PandaDoc form started:", data);
          onStarted?.(data);
        },
        completed: (data: any) => {
          console.log("PandaDoc form completed:", data);
          onCompleted?.(data);
        },
        exception: (data: any) => {
          console.error("PandaDoc form exception:", data);
          onException?.(data);
        },
      },
      data: {
        // Contract
        "Contract.Date": leaseData.contractDate,

        // Landlord
        "Landlord.FirstName": leaseData.landlordFirstName,
        "Landlord.LastName": leaseData.landlordLastName,
        "Landlord.Email": leaseData.landlordEmail,

        // Tenant
        "Tenant.FirstName": leaseData.tenantFirstName,
        "Tenant.LastName": leaseData.tenantLastName,
        "Tenant.Email": leaseData.tenantEmail,
        "Tenant.Phone": leaseData.tenantPhone,

        // Property
        "Property.StreetAddress": leaseData.propertyStreetAddress,
        "Property.UnitNumber": leaseData.propertyUnitNumber,
        "Property.City": leaseData.propertyCity,
        "Property.State": leaseData.propertyState,
        "Property.Zipcode": leaseData.propertyZipcode,

        // Lease Terms
        "Lease.StartDate": leaseData.leaseStartDate,
        "Lease.EndDate": leaseData.leaseEndDate,
        "Lease.MonthlyRent": leaseData.leaseMonthlyRent,
        "Lease.RentDueDay": leaseData.leaseRentDueDay,
        "Lease.SecurityDeposit": leaseData.leaseSecurityDeposit,
        "Lease.PetDeposit": leaseData.leasePetDeposit,
        "Lease.NoticePeriodDays": leaseData.leaseNoticePeriodDays,
        "Lease.MoveOutRequirements": leaseData.leaseMoveOutRequirements,
      },
    };

    // Build data query string
    const dataQueryString = Object.keys(config.data)
      .map((key) => {
        return "&" + key + "=" + encodeURIComponent(JSON.stringify(config.data[key as keyof typeof config.data]));
      })
      .join("");

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.frameBorder = "0";
    iframe.src = config.url + dataQueryString;
    iframe.style.height = "100%";
    iframe.style.width = "100%";
    iframe.style.border = "none";

    iframeRef.current = iframe;

    // Set container styles
    containerRef.current.style.height = config.height;
    containerRef.current.style.width = config.width;
    containerRef.current.appendChild(iframe);

    // Listen for messages from iframe
    const messageHandler = (e: MessageEvent) => {
      if (e && e.data && iframe && e.source === iframe.contentWindow) {
        try {
          const message = JSON.parse(e.data);
          if (message && message.event) {
            const event = message.event.replace("embed.form.", "");
            const callback = config.events[event as keyof typeof config.events];
            if (callback) {
              callback(message.data);
            }
          }
        } catch (err) {
          // Ignore JSON parse errors from other sources
        }
      }
    };

    window.addEventListener("message", messageHandler);

    // Cleanup
    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, [leaseData, onLoaded, onStarted, onCompleted, onException, height]);

  return (
    <div
      ref={containerRef}
      id="pandadoc-form-container"
      className="w-full border rounded-lg overflow-hidden"
    />
  );
}
