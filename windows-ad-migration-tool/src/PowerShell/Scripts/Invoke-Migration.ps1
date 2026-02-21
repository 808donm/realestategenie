<#
.SYNOPSIS
    Main migration execution script.
.DESCRIPTION
    Orchestrates the full AD migration process based on a migration plan JSON file.
    Can be run standalone or invoked from the WPF application.
.PARAMETER PlanFile
    Path to the migration plan JSON file.
.PARAMETER DryRun
    If specified, no changes are made. Outputs what would happen.
.EXAMPLE
    .\Invoke-Migration.ps1 -PlanFile ".\migration-plan.json" -DryRun
    .\Invoke-Migration.ps1 -PlanFile ".\migration-plan.json"
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$PlanFile,

    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot "..\Modules\ADMigrationModule.psm1") -Force

# Load migration plan
if (-not (Test-Path $PlanFile)) {
    Write-Error "Migration plan file not found: $PlanFile"
    exit 1
}

$plan = Get-Content $PlanFile -Raw | ConvertFrom-Json

# Prompt for credentials
$sourceCredential = Get-Credential -Message "Enter credentials for source domain: $($plan.SourceDomain.DomainName)"
$targetCredential = Get-Credential -Message "Enter credentials for target domain: $($plan.TargetDomain.DomainName)"

# Initialize session
Initialize-MigrationSession `
    -SourceDomainController $plan.SourceDomain.DomainController `
    -TargetDomainController $plan.TargetDomain.DomainController `
    -SourceCredential $sourceCredential `
    -TargetCredential $targetCredential

Write-Log "Migration started. Plan: $PlanFile, DryRun: $DryRun"

$results = @{
    Groups = @()
    Users  = @()
    Errors = @()
}

# Phase 1: Migrate Groups
Write-Host "`n=== Phase 1: Migrating Groups ===" -ForegroundColor Cyan
foreach ($groupDN in $plan.SelectedGroupDNs) {
    $sourceGroup = Get-ADGroup -Server $plan.SourceDomain.DomainController `
        -Credential $sourceCredential -Identity $groupDN -Properties *

    $targetOU = $plan.OUMappings | Where-Object { $groupDN -like "*$($_.SourceOU)*" } |
        Select-Object -ExpandProperty TargetOU -First 1

    if (-not $targetOU) {
        Write-Log "WARNING: No OU mapping found for group $groupDN" -Level Warning
        continue
    }

    if ($DryRun) {
        Write-Host "[DRY RUN] Would migrate group '$($sourceGroup.Name)' to $targetOU"
    }
    else {
        $result = $sourceGroup | Copy-ADGroupToTarget -TargetOU $targetOU
        $results.Groups += $result
    }
}

# Phase 2: Migrate Users
Write-Host "`n=== Phase 2: Migrating Users ===" -ForegroundColor Cyan
$userGroupMap = @{}

foreach ($userDN in $plan.SelectedUserDNs) {
    $sourceUser = Get-ADUser -Server $plan.SourceDomain.DomainController `
        -Credential $sourceCredential -Identity $userDN -Properties *

    $targetOU = $plan.OUMappings | Where-Object { $userDN -like "*$($_.SourceOU)*" } |
        Select-Object -ExpandProperty TargetOU -First 1

    if (-not $targetOU) {
        Write-Log "WARNING: No OU mapping found for user $userDN" -Level Warning
        continue
    }

    # Track group memberships for later restoration
    if ($plan.Options.MigrateGroupMemberships) {
        $userGroupMap[$sourceUser.SamAccountName] = $sourceUser.MemberOf |
            ForEach-Object { ($_ -split ',')[0] -replace 'CN=' }
    }

    if ($DryRun) {
        Write-Host "[DRY RUN] Would migrate user '$($sourceUser.DisplayName)' to $targetOU"
    }
    else {
        $result = $sourceUser | Copy-ADUserToTarget -TargetOU $targetOU -PreserveEnabled
        $results.Users += $result
    }
}

# Phase 3: Restore Group Memberships
if ($plan.Options.MigrateGroupMemberships -and -not $DryRun) {
    Write-Host "`n=== Phase 3: Restoring Group Memberships ===" -ForegroundColor Cyan
    Restore-GroupMemberships -UserGroupMap $userGroupMap
}

# Summary
Write-Host "`n=== Migration Summary ===" -ForegroundColor Green
Write-Host "Groups: $($results.Groups.Count) processed"
Write-Host "  Succeeded: $(($results.Groups | Where-Object Status -eq 'Succeeded').Count)"
Write-Host "  Failed: $(($results.Groups | Where-Object Status -eq 'Failed').Count)"
Write-Host "  Skipped: $(($results.Groups | Where-Object Status -eq 'Skipped').Count)"
Write-Host "Users: $($results.Users.Count) processed"
Write-Host "  Succeeded: $(($results.Users | Where-Object Status -eq 'Succeeded').Count)"
Write-Host "  Failed: $(($results.Users | Where-Object Status -eq 'Failed').Count)"
Write-Host "  Skipped: $(($results.Users | Where-Object Status -eq 'Skipped').Count)"

# Export results
$resultsFile = Join-Path (Split-Path $PlanFile) "migration-results_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$results | ConvertTo-Json -Depth 10 | Out-File $resultsFile -Encoding UTF8
Write-Host "`nResults exported to: $resultsFile"
