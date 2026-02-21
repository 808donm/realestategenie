namespace ADMigrationTool.Models
{
    public class ConnectionResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string ForestName { get; set; } = string.Empty;
        public string DomainLevel { get; set; } = string.Empty;
        public int TotalUsers { get; set; }
        public int TotalGroups { get; set; }
    }

    public class MigrationResult
    {
        public bool Success { get; set; }
        public int TotalProcessed { get; set; }
        public int Succeeded { get; set; }
        public int Failed { get; set; }
        public int Skipped { get; set; }
        public List<MigrationLogEntry> Log { get; set; } = new();
        public TimeSpan Duration { get; set; }
    }

    public class MigrationLogEntry
    {
        public DateTime Timestamp { get; set; }
        public string ObjectName { get; set; } = string.Empty;
        public string ObjectType { get; set; } = string.Empty;
        public MigrationStatus Status { get; set; }
        public string SourceOU { get; set; } = string.Empty;
        public string TargetOU { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public enum MigrationStatus
    {
        Pending,
        InProgress,
        Succeeded,
        Failed,
        Skipped
    }

    public class ActivityEntry
    {
        public string Timestamp { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
    }
}
