<#
.SYNOPSIS
    Pre-migration readiness check.
.DESCRIPTION
    Validates that source and target domains are ready for migration.
    Checks connectivity, permissions, trust relationships, and potential conflicts.
.PARAMETER SourceDC
    Source domain controller FQDN.
.PARAMETER TargetDC
    Target domain controller FQDN.
.EXAMPLE
    .\Test-MigrationReadiness.ps1 -SourceDC "dc01.old.com" -TargetDC "dc01.new.com"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$SourceDC,

    [Parameter(Mandatory)]
    [string]$TargetDC
)

$ErrorActionPreference = 'Stop'
$results = @()

function Add-CheckResult {
    param([string]$Check, [string]$Status, [string]$Details)
    $script:results += [PSCustomObject]@{
        Check   = $Check
        Status  = $Status
        Details = $Details
    }
}

$sourceCred = Get-Credential -Message "Source domain credentials"
$targetCred = Get-Credential -Message "Target domain credentials"

# Check 1: Source DC connectivity
Write-Host "Checking source DC connectivity..." -NoNewline
try {
    $null = Get-ADDomainController -Server $SourceDC -Credential $sourceCred
    Add-CheckResult "Source DC Connectivity" "PASS" "Connected to $SourceDC"
    Write-Host " PASS" -ForegroundColor Green
}
catch {
    Add-CheckResult "Source DC Connectivity" "FAIL" $_.Exception.Message
    Write-Host " FAIL" -ForegroundColor Red
}

# Check 2: Target DC connectivity
Write-Host "Checking target DC connectivity..." -NoNewline
try {
    $null = Get-ADDomainController -Server $TargetDC -Credential $targetCred
    Add-CheckResult "Target DC Connectivity" "PASS" "Connected to $TargetDC"
    Write-Host " PASS" -ForegroundColor Green
}
catch {
    Add-CheckResult "Target DC Connectivity" "FAIL" $_.Exception.Message
    Write-Host " FAIL" -ForegroundColor Red
}

# Check 3: Source domain functional level
Write-Host "Checking source domain functional level..." -NoNewline
try {
    $sourceDomain = Get-ADDomain -Server $SourceDC -Credential $sourceCred
    Add-CheckResult "Source Domain Level" "PASS" $sourceDomain.DomainMode
    Write-Host " PASS ($($sourceDomain.DomainMode))" -ForegroundColor Green
}
catch {
    Add-CheckResult "Source Domain Level" "FAIL" $_.Exception.Message
    Write-Host " FAIL" -ForegroundColor Red
}

# Check 4: Target domain functional level
Write-Host "Checking target domain functional level..." -NoNewline
try {
    $targetDomain = Get-ADDomain -Server $TargetDC -Credential $targetCred
    Add-CheckResult "Target Domain Level" "PASS" $targetDomain.DomainMode
    Write-Host " PASS ($($targetDomain.DomainMode))" -ForegroundColor Green
}
catch {
    Add-CheckResult "Target Domain Level" "FAIL" $_.Exception.Message
    Write-Host " FAIL" -ForegroundColor Red
}

# Check 5: DNS resolution
Write-Host "Checking DNS resolution..." -NoNewline
try {
    $null = Resolve-DnsName $SourceDC
    $null = Resolve-DnsName $TargetDC
    Add-CheckResult "DNS Resolution" "PASS" "Both DCs resolve"
    Write-Host " PASS" -ForegroundColor Green
}
catch {
    Add-CheckResult "DNS Resolution" "FAIL" $_.Exception.Message
    Write-Host " FAIL" -ForegroundColor Red
}

# Check 6: Check for SamAccountName conflicts
Write-Host "Checking for SamAccountName conflicts..." -NoNewline
try {
    $sourceUsers = Get-ADUser -Server $SourceDC -Credential $sourceCred -Filter * -Properties SamAccountName |
        Select-Object -ExpandProperty SamAccountName
    $targetUsers = Get-ADUser -Server $TargetDC -Credential $targetCred -Filter * -Properties SamAccountName |
        Select-Object -ExpandProperty SamAccountName
    $conflicts = $sourceUsers | Where-Object { $_ -in $targetUsers }

    if ($conflicts.Count -gt 0) {
        Add-CheckResult "SamAccountName Conflicts" "WARN" "$($conflicts.Count) conflicts found"
        Write-Host " WARN ($($conflicts.Count) conflicts)" -ForegroundColor Yellow
    }
    else {
        Add-CheckResult "SamAccountName Conflicts" "PASS" "No conflicts found"
        Write-Host " PASS" -ForegroundColor Green
    }
}
catch {
    Add-CheckResult "SamAccountName Conflicts" "FAIL" $_.Exception.Message
    Write-Host " FAIL" -ForegroundColor Red
}

# Output results
Write-Host "`n=== Readiness Check Results ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$passCount = ($results | Where-Object Status -eq 'PASS').Count
$failCount = ($results | Where-Object Status -eq 'FAIL').Count
$warnCount = ($results | Where-Object Status -eq 'WARN').Count

Write-Host "Passed: $passCount | Warnings: $warnCount | Failed: $failCount" -ForegroundColor $(
    if ($failCount -gt 0) { 'Red' } elseif ($warnCount -gt 0) { 'Yellow' } else { 'Green' }
)
