<#
.SYNOPSIS
    Export a full inventory of AD users, groups, and OUs from a domain.
.DESCRIPTION
    Connects to a domain controller and exports all users, groups, and OU structure
    to CSV and JSON files for analysis and migration planning.
.PARAMETER DomainController
    The FQDN of the domain controller to connect to.
.PARAMETER OutputPath
    Directory to save the exported files.
.EXAMPLE
    .\Export-ADInventory.ps1 -DomainController "dc01.contoso.com" -OutputPath ".\exports"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$DomainController,

    [string]$OutputPath = ".\exports"
)

$ErrorActionPreference = 'Stop'

$credential = Get-Credential -Message "Enter credentials for $DomainController"

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

# Export Users
Write-Host "Exporting users..." -ForegroundColor Cyan
$users = Get-ADUser -Server $DomainController -Credential $credential -Filter * -Properties `
    DisplayName, SamAccountName, UserPrincipalName, EmailAddress, GivenName, Surname, `
    Enabled, LastLogonDate, PasswordLastSet, Description, Department, Title, Manager, `
    MemberOf, DistinguishedName, SID, WhenCreated, WhenChanged

$users | Select-Object DisplayName, SamAccountName, UserPrincipalName, EmailAddress, `
    GivenName, Surname, Enabled, LastLogonDate, PasswordLastSet, Description, `
    Department, Title, DistinguishedName |
    Export-Csv -Path (Join-Path $OutputPath "users_$timestamp.csv") -NoTypeInformation

$users | Select-Object DisplayName, SamAccountName, UserPrincipalName, EmailAddress, `
    GivenName, Surname, Enabled, LastLogonDate, PasswordLastSet, Description, `
    Department, Title, Manager, MemberOf, DistinguishedName, SID |
    ConvertTo-Json -Depth 5 |
    Out-File (Join-Path $OutputPath "users_$timestamp.json") -Encoding UTF8

Write-Host "  Exported $($users.Count) users"

# Export Groups
Write-Host "Exporting groups..." -ForegroundColor Cyan
$groups = Get-ADGroup -Server $DomainController -Credential $credential -Filter * -Properties `
    Name, SamAccountName, GroupScope, GroupCategory, Description, Members, `
    DistinguishedName, SID, WhenCreated, WhenChanged

$groups | Select-Object Name, SamAccountName, GroupScope, GroupCategory, Description, `
    @{N='MemberCount';E={$_.Members.Count}}, DistinguishedName |
    Export-Csv -Path (Join-Path $OutputPath "groups_$timestamp.csv") -NoTypeInformation

$groups | Select-Object Name, SamAccountName, GroupScope, GroupCategory, Description, `
    Members, DistinguishedName, SID |
    ConvertTo-Json -Depth 5 |
    Out-File (Join-Path $OutputPath "groups_$timestamp.json") -Encoding UTF8

Write-Host "  Exported $($groups.Count) groups"

# Export OU Structure
Write-Host "Exporting OU structure..." -ForegroundColor Cyan
$ous = Get-ADOrganizationalUnit -Server $DomainController -Credential $credential -Filter * -Properties `
    Name, DistinguishedName, Description, WhenCreated

$ous | Select-Object Name, DistinguishedName, Description |
    Export-Csv -Path (Join-Path $OutputPath "ous_$timestamp.csv") -NoTypeInformation

$ous | ConvertTo-Json -Depth 5 |
    Out-File (Join-Path $OutputPath "ous_$timestamp.json") -Encoding UTF8

Write-Host "  Exported $($ous.Count) OUs"

Write-Host "`nInventory export complete. Files saved to: $OutputPath" -ForegroundColor Green
