"use client";

import { useState, useMemo } from "react";

type ErrorLog = {
  id: string;
  endpoint: string | null;
  error_message: string;
  error_code: string | null;
  severity: string;
  stack_trace: string | null;
  user_agent: string | null;
  created_at: string;
  agent: {
    id: string;
    display_name: string;
    email: string;
  } | null;
};

export default function ErrorLogsClient({
  errorLogs,
}: {
  errorLogs: ErrorLog[];
}) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filter error logs based on severity and search query
  const filteredLogs = useMemo(() => {
    return errorLogs.filter((log) => {
      const matchesSeverity =
        severityFilter === "all" || log.severity === severityFilter;
      const matchesSearch =
        !searchQuery ||
        log.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.endpoint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.agent?.email?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSeverity && matchesSearch;
    });
  }, [errorLogs, severityFilter, searchQuery]);

  // Group logs by severity for stats
  const stats = useMemo(() => {
    return {
      total: errorLogs.length,
      critical: errorLogs.filter((l) => l.severity === "critical").length,
      error: errorLogs.filter((l) => l.severity === "error").length,
      warning: errorLogs.filter((l) => l.severity === "warning").length,
      info: errorLogs.filter((l) => l.severity === "info").length,
    };
  }, [errorLogs]);

  // Auto-refresh every 30 seconds
  if (autoRefresh) {
    setTimeout(() => {
      window.location.reload();
    }, 30000);
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "critical":
        return "#dc2626";
      case "error":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  }

  function getSeverityBgColor(severity: string) {
    switch (severity) {
      case "critical":
        return "#fee2e2";
      case "error":
        return "#fef2f2";
      case "warning":
        return "#fef3c7";
      case "info":
        return "#dbeafe";
      default:
        return "#f3f4f6";
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleString();
  }

  return (
    <div>
      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Total Logs
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total}</div>
        </div>

        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Critical
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>
            {stats.critical}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Errors
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444" }}>
            {stats.error}
          </div>
        </div>

        <div
          style={{
            padding: 20,
            background: "white",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Warnings
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>
            {stats.warning}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 20,
          border: "1px solid #e5e7eb",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 250 }}>
            <input
              type="text"
              placeholder="Search by message, endpoint, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: 14,
              background: "white",
            }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Auto-refresh (30s)
          </label>

          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Showing {filteredLogs.length} of {stats.total} logs
          </div>
        </div>
      </div>

      {/* Error Logs Table */}
      <div
        style={{
          background: "white",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
            {searchQuery || severityFilter !== "all"
              ? "No logs match your filters"
              : "No error logs found"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Severity
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Time
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Endpoint
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    Error Message
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    User
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setExpandedLog(expandedLog === log.id ? null : log.id)
                      }
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            color: getSeverityColor(log.severity),
                            background: getSeverityBgColor(log.severity),
                            textTransform: "uppercase",
                          }}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 14,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(log.created_at)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 14,
                          fontFamily: "monospace",
                        }}
                      >
                        {log.endpoint || "-"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 14,
                          maxWidth: 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.error_message}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 14,
                          color: "#6b7280",
                        }}
                      >
                        {log.agent?.display_name || "-"}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 14,
                          textAlign: "center",
                        }}
                      >
                        <span style={{ fontSize: 12 }}>
                          {expandedLog === log.id ? "▼" : "▶"}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedLog === log.id && (
                      <tr style={{ background: "#f9fafb" }}>
                        <td colSpan={6} style={{ padding: 20 }}>
                          <div style={{ display: "grid", gap: 16 }}>
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#6b7280",
                                  marginBottom: 4,
                                }}
                              >
                                Full Error Message
                              </div>
                              <div
                                style={{
                                  padding: 12,
                                  background: "white",
                                  borderRadius: 6,
                                  fontSize: 14,
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {log.error_message}
                              </div>
                            </div>

                            {log.error_code && (
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#6b7280",
                                    marginBottom: 4,
                                  }}
                                >
                                  Error Code
                                </div>
                                <div
                                  style={{
                                    padding: 12,
                                    background: "white",
                                    borderRadius: 6,
                                    fontSize: 14,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {log.error_code}
                                </div>
                              </div>
                            )}

                            {log.stack_trace && (
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#6b7280",
                                    marginBottom: 4,
                                  }}
                                >
                                  Stack Trace
                                </div>
                                <div
                                  style={{
                                    padding: 12,
                                    background: "white",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontFamily: "monospace",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    maxHeight: 300,
                                    overflow: "auto",
                                  }}
                                >
                                  {log.stack_trace}
                                </div>
                              </div>
                            )}

                            {log.user_agent && (
                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#6b7280",
                                    marginBottom: 4,
                                  }}
                                >
                                  User Agent
                                </div>
                                <div
                                  style={{
                                    padding: 12,
                                    background: "white",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontFamily: "monospace",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {log.user_agent}
                                </div>
                              </div>
                            )}

                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#6b7280",
                                  marginBottom: 4,
                                }}
                              >
                                Full Timestamp
                              </div>
                              <div
                                style={{
                                  padding: 12,
                                  background: "white",
                                  borderRadius: 6,
                                  fontSize: 14,
                                }}
                              >
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
