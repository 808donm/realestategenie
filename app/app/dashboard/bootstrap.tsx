"use client";

import { useEffect } from "react";

export default function BootstrapAgent() {
  useEffect(() => {
    fetch("/api/bootstrap-agent", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
