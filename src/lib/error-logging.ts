/**
 * Error Logging Utility
 * Centralized error logging to database
 */

import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface LogErrorParams {
  agentId?: string;
  endpoint?: string;
  errorMessage: string;
  errorCode?: string;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
  requestMethod?: string;
  requestBody?: any;
  severity?: ErrorSeverity;
}

/**
 * Log an error to the database
 */
export async function logError(params: LogErrorParams): Promise<void> {
  try {
    await admin.from("error_logs").insert({
      agent_id: params.agentId || null,
      endpoint: params.endpoint || null,
      error_message: params.errorMessage,
      error_code: params.errorCode || null,
      stack_trace: params.stackTrace || null,
      user_agent: params.userAgent || null,
      ip_address: params.ipAddress || null,
      request_method: params.requestMethod || null,
      request_body: params.requestBody || null,
      severity: params.severity || "error",
    });

    // Also log to console for development
    if (process.env.NODE_ENV === "development") {
      console.error("[Error Log]", {
        endpoint: params.endpoint,
        message: params.errorMessage,
        severity: params.severity,
      });
    }
  } catch (loggingError) {
    // If logging fails, at least log to console
    console.error("Failed to log error to database:", loggingError);
    console.error("Original error:", params);
  }
}

/**
 * Log an error from a caught exception
 */
export async function logException(
  error: Error,
  context?: Partial<LogErrorParams>
): Promise<void> {
  await logError({
    errorMessage: error.message,
    stackTrace: error.stack,
    severity: "error",
    ...context,
  });
}

/**
 * Express/API route error logger helper
 */
export async function logApiError(
  request: Request,
  error: Error,
  agentId?: string
): Promise<void> {
  const url = new URL(request.url);

  await logError({
    agentId,
    endpoint: url.pathname,
    errorMessage: error.message,
    stackTrace: error.stack,
    userAgent: request.headers.get("user-agent") || undefined,
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined,
    requestMethod: request.method,
    severity: "error",
  });
}
