namespace ADMigrationTool.Models
{
    public class ADUser
    {
        public bool IsSelected { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string SamAccountName { get; set; } = string.Empty;
        public string UserPrincipalName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string OrganizationalUnit { get; set; } = string.Empty;
        public string DistinguishedName { get; set; } = string.Empty;
        public bool Enabled { get; set; }
        public DateTime? LastLogon { get; set; }
        public DateTime? PasswordLastSet { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Manager { get; set; } = string.Empty;
        public List<string> MemberOf { get; set; } = new();
        public string SID { get; set; } = string.Empty;
    }
}
