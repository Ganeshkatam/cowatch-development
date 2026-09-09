export class SecurityLogger {
  static log(
    level: "INFO" | "WARN" | "ERROR",
    event: string,
    details: Record<string, unknown> = {},
    source: string = "system"
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      source,
      ...details,
    };
    
    // We log to stdout as structured JSON, without any sensitive secrets
    if (level === "ERROR" || level === "WARN") {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  static info(event: string, details: Record<string, unknown> = {}, source: string = "system") {
    this.log("INFO", event, details, source);
  }

  static warn(event: string, details: Record<string, unknown> = {}, source: string = "system") {
    this.log("WARN", event, details, source);
  }

  static error(event: string, details: Record<string, unknown> = {}, source: string = "system") {
    this.log("ERROR", event, details, source);
  }
}
