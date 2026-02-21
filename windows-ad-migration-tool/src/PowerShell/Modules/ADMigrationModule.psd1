@{
    RootModule        = 'ADMigrationModule.psm1'
    ModuleVersion     = '1.0.0'
    GUID              = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    Author            = 'AD Migration Tool'
    Description       = 'PowerShell module for Active Directory migration operations'
    PowerShellVersion = '5.1'
    RequiredModules   = @('ActiveDirectory')
    FunctionsToExport = @(
        'Initialize-MigrationSession',
        'Get-SourceUsers',
        'Get-SourceGroups',
        'Copy-ADUserToTarget',
        'Copy-ADGroupToTarget',
        'Restore-GroupMemberships',
        'Write-Log'
    )
    CmdletsToExport   = @()
    VariablesToExport  = @()
    AliasesToExport    = @()
}
