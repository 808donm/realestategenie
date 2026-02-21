namespace ADMigrationTool.Models
{
    public class ADGroup
    {
        public bool IsSelected { get; set; }
        public string Name { get; set; } = string.Empty;
        public string SamAccountName { get; set; } = string.Empty;
        public string DistinguishedName { get; set; } = string.Empty;
        public string OrganizationalUnit { get; set; } = string.Empty;
        public string GroupType { get; set; } = string.Empty;
        public string GroupScope { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public List<string> Members { get; set; } = new();
        public string SID { get; set; } = string.Empty;
    }
}
