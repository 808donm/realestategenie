namespace ADMigrationTool.Models
{
    public class MigrationPlan
    {
        public string Name { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DomainConnection SourceDomain { get; set; } = new();
        public DomainConnection TargetDomain { get; set; } = new();
        public MigrationOptions Options { get; set; } = new();
        public List<OUMapping> OUMappings { get; set; } = new();
        public List<string> SelectedUserDNs { get; set; } = new();
        public List<string> SelectedGroupDNs { get; set; } = new();
        public ConflictResolutionStrategy ConflictResolution { get; set; } = ConflictResolutionStrategy.Skip;
    }

    public class DomainConnection
    {
        public string DomainController { get; set; } = string.Empty;
        public string DomainName { get; set; } = string.Empty;
        public bool UseSSL { get; set; }
    }

    public class MigrationOptions
    {
        public bool MigratePasswords { get; set; }
        public bool MigrateSIDHistory { get; set; }
        public bool MigrateGroupMemberships { get; set; } = true;
        public bool MigrateUserProfiles { get; set; }
        public bool DisableSourceAccounts { get; set; }
        public int BatchSize { get; set; } = 50;
        public int RetryAttempts { get; set; } = 3;
        public int TimeoutSeconds { get; set; } = 30;
    }

    public class OUMapping
    {
        public string SourceOU { get; set; } = string.Empty;
        public string TargetOU { get; set; } = string.Empty;
    }

    public enum ConflictResolutionStrategy
    {
        Skip,
        MergeAttributes,
        Replace,
        RenameAndCreate
    }
}
