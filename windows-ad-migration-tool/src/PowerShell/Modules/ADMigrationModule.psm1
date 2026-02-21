#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    AD Migration Tool - PowerShell Module
.DESCRIPTION
    Core PowerShell module for Active Directory migration operations.
    Provides functions for querying, migrating, and validating AD objects
    between source and target domains.
#>

# Module-level variables
$Script:SourceDC = $null
$Script:TargetDC = $null
$Script:SourceCredential = $null
$Script:TargetCredential = $null
$Script:LogPath = Join-Path $PSScriptRoot "..\..\logs"

function Initialize-MigrationSession {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourceDomainController,

        [Parameter(Mandatory)]
        [string]$TargetDomainController,

        [Parameter(Mandatory)]
        [PSCredential]$SourceCredential,

        [Parameter(Mandatory)]
        [PSCredential]$TargetCredential
    )

    $Script:SourceDC = $SourceDomainController
    $Script:TargetDC = $TargetDomainController
    $Script:SourceCredential = $SourceCredential
    $Script:TargetCredential = $TargetCredential

    if (-not (Test-Path $Script:LogPath)) {
        New-Item -ItemType Directory -Path $Script:LogPath -Force | Out-Null
    }

    Write-Log "Migration session initialized. Source: $SourceDomainController, Target: $TargetDomainController"
}

function Get-SourceUsers {
    [CmdletBinding()]
    param(
        [string]$SearchBase,
        [string]$Filter = "*"
    )

    try {
        $params = @{
            Server     = $Script:SourceDC
            Credential = $Script:SourceCredential
            Filter     = $Filter
            Properties = @(
                'DisplayName', 'SamAccountName', 'UserPrincipalName', 'EmailAddress',
                'GivenName', 'Surname', 'Enabled', 'LastLogonDate', 'PasswordLastSet',
                'Description', 'Department', 'Title', 'Manager', 'MemberOf',
                'DistinguishedName', 'SID'
            )
        }

        if ($SearchBase) {
            $params['SearchBase'] = $SearchBase
        }

        Get-ADUser @params
    }
    catch {
        Write-Log "ERROR: Failed to get source users: $_" -Level Error
        throw
    }
}

function Get-SourceGroups {
    [CmdletBinding()]
    param(
        [string]$SearchBase,
        [string]$Filter = "*"
    )

    try {
        $params = @{
            Server     = $Script:SourceDC
            Credential = $Script:SourceCredential
            Filter     = $Filter
            Properties = @(
                'Name', 'SamAccountName', 'GroupScope', 'GroupCategory',
                'Description', 'Members', 'DistinguishedName', 'SID'
            )
        }

        if ($SearchBase) {
            $params['SearchBase'] = $SearchBase
        }

        Get-ADGroup @params
    }
    catch {
        Write-Log "ERROR: Failed to get source groups: $_" -Level Error
        throw
    }
}

function Copy-ADUserToTarget {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [Microsoft.ActiveDirectory.Management.ADUser]$SourceUser,

        [Parameter(Mandatory)]
        [string]$TargetOU,

        [switch]$MigratePassword,
        [switch]$PreserveEnabled
    )

    process {
        $userName = $SourceUser.SamAccountName

        if ($PSCmdlet.ShouldProcess($userName, "Migrate user to $TargetOU")) {
            try {
                # Check if user already exists in target
                $existingUser = Get-ADUser -Server $Script:TargetDC -Credential $Script:TargetCredential `
                    -Filter "SamAccountName -eq '$userName'" -ErrorAction SilentlyContinue

                if ($existingUser) {
                    Write-Log "SKIP: User '$userName' already exists in target domain"
                    return [PSCustomObject]@{
                        User   = $userName
                        Status = 'Skipped'
                        Reason = 'Already exists in target'
                    }
                }

                # Create user in target domain
                $newUserParams = @{
                    Server             = $Script:TargetDC
                    Credential         = $Script:TargetCredential
                    Name               = $SourceUser.Name
                    SamAccountName     = $SourceUser.SamAccountName
                    UserPrincipalName  = $SourceUser.UserPrincipalName
                    GivenName          = $SourceUser.GivenName
                    Surname            = $SourceUser.Surname
                    DisplayName        = $SourceUser.DisplayName
                    EmailAddress       = $SourceUser.EmailAddress
                    Description        = $SourceUser.Description
                    Department         = $SourceUser.Department
                    Title              = $SourceUser.Title
                    Path               = $TargetOU
                    Enabled            = if ($PreserveEnabled) { $SourceUser.Enabled } else { $false }
                    AccountPassword    = (ConvertTo-SecureString "TempP@ss123!" -AsPlainText -Force)
                    ChangePasswordAtLogon = $true
                }

                New-ADUser @newUserParams
                Write-Log "SUCCESS: Migrated user '$userName' to $TargetOU"

                return [PSCustomObject]@{
                    User   = $userName
                    Status = 'Succeeded'
                    Reason = ''
                }
            }
            catch {
                Write-Log "ERROR: Failed to migrate user '$userName': $_" -Level Error
                return [PSCustomObject]@{
                    User   = $userName
                    Status = 'Failed'
                    Reason = $_.Exception.Message
                }
            }
        }
    }
}

function Copy-ADGroupToTarget {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [Microsoft.ActiveDirectory.Management.ADGroup]$SourceGroup,

        [Parameter(Mandatory)]
        [string]$TargetOU
    )

    process {
        $groupName = $SourceGroup.SamAccountName

        if ($PSCmdlet.ShouldProcess($groupName, "Migrate group to $TargetOU")) {
            try {
                $existingGroup = Get-ADGroup -Server $Script:TargetDC -Credential $Script:TargetCredential `
                    -Filter "SamAccountName -eq '$groupName'" -ErrorAction SilentlyContinue

                if ($existingGroup) {
                    Write-Log "SKIP: Group '$groupName' already exists in target domain"
                    return [PSCustomObject]@{
                        Group  = $groupName
                        Status = 'Skipped'
                        Reason = 'Already exists in target'
                    }
                }

                $newGroupParams = @{
                    Server        = $Script:TargetDC
                    Credential    = $Script:TargetCredential
                    Name          = $SourceGroup.Name
                    SamAccountName = $SourceGroup.SamAccountName
                    GroupScope    = $SourceGroup.GroupScope
                    GroupCategory = $SourceGroup.GroupCategory
                    Description   = $SourceGroup.Description
                    Path          = $TargetOU
                }

                New-ADGroup @newGroupParams
                Write-Log "SUCCESS: Migrated group '$groupName' to $TargetOU"

                return [PSCustomObject]@{
                    Group  = $groupName
                    Status = 'Succeeded'
                    Reason = ''
                }
            }
            catch {
                Write-Log "ERROR: Failed to migrate group '$groupName': $_" -Level Error
                return [PSCustomObject]@{
                    Group  = $groupName
                    Status = 'Failed'
                    Reason = $_.Exception.Message
                }
            }
        }
    }
}

function Restore-GroupMemberships {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [hashtable]$UserGroupMap
    )

    foreach ($user in $UserGroupMap.Keys) {
        foreach ($group in $UserGroupMap[$user]) {
            if ($PSCmdlet.ShouldProcess("$user -> $group", "Add to group")) {
                try {
                    Add-ADGroupMember -Server $Script:TargetDC -Credential $Script:TargetCredential `
                        -Identity $group -Members $user
                    Write-Log "SUCCESS: Added '$user' to group '$group'"
                }
                catch {
                    Write-Log "ERROR: Failed to add '$user' to group '$group': $_" -Level Error
                }
            }
        }
    }
}

function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [ValidateSet('Info', 'Warning', 'Error')]
        [string]$Level = 'Info'
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"

    $logFile = Join-Path $Script:LogPath "migration_$(Get-Date -Format 'yyyyMMdd').log"
    $logEntry | Out-File -FilePath $logFile -Append -Encoding UTF8

    switch ($Level) {
        'Error'   { Write-Error $Message }
        'Warning' { Write-Warning $Message }
        default   { Write-Verbose $Message }
    }
}

Export-ModuleMember -Function @(
    'Initialize-MigrationSession',
    'Get-SourceUsers',
    'Get-SourceGroups',
    'Copy-ADUserToTarget',
    'Copy-ADGroupToTarget',
    'Restore-GroupMemberships',
    'Write-Log'
)
