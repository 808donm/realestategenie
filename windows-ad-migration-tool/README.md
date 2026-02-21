# Windows AD Migration Tool

A desktop application for migrating Active Directory users, groups, and organizational units between Windows domains.

## Architecture

The tool is built with three technology layers:

- **WPF Desktop App (.NET 8)** - Main UI for configuring and executing migrations
- **PowerShell Modules** - AD operations using the ActiveDirectory module
- **Python Utilities** - Data analysis, inventory comparison, and HTML report generation

## Project Structure

```
windows-ad-migration-tool/
├── src/
│   ├── WpfApp/              # .NET 8 WPF desktop application
│   │   ├── Views/           # XAML pages (Dashboard, Domain Connection, etc.)
│   │   ├── Models/          # Data models (ADUser, ADGroup, MigrationPlan)
│   │   ├── Services/        # Business logic (AD service, Migration engine, PS bridge)
│   │   └── Styles/          # WPF themes and styles
│   ├── PowerShell/
│   │   ├── Modules/         # ADMigrationModule (core AD operations)
│   │   └── Scripts/         # Standalone scripts (Invoke-Migration, Export-ADInventory)
│   └── Python/
│       ├── utils/           # Analysis and reporting modules
│       └── scripts/         # Domain comparison and data processing
├── tests/
├── config/
└── docs/
```

## Prerequisites

- Windows 10/11 or Windows Server 2016+
- .NET 8.0 SDK
- PowerShell 5.1+ with the ActiveDirectory module (`Install-WindowsFeature RSAT-AD-PowerShell`)
- Python 3.10+ (for analysis and reporting tools)
- Domain Admin or delegated permissions on both source and target domains

## Getting Started

### Build the WPF App

```bash
cd src/WpfApp
dotnet restore
dotnet build
dotnet run
```

### Install Python Dependencies

```bash
cd src/Python
pip install -r requirements.txt
```

### Run PowerShell Scripts Standalone

```powershell
# Export AD inventory
.\src\PowerShell\Scripts\Export-ADInventory.ps1 -DomainController "dc01.contoso.com"

# Run readiness checks
.\src\PowerShell\Scripts\Test-MigrationReadiness.ps1 -SourceDC "dc01.old.com" -TargetDC "dc01.new.com"

# Execute migration from a plan file
.\src\PowerShell\Scripts\Invoke-Migration.ps1 -PlanFile ".\migration-plan.json" -DryRun
```

## Migration Workflow

1. **Connect** to source and target domain controllers
2. **Browse** users and groups in the source domain
3. **Select** objects to migrate and configure OU mappings
4. **Plan** the migration (conflict resolution, options)
5. **Dry Run** to validate without making changes
6. **Execute** the migration
7. **Review** reports and resolve any failures

## Key Features

- Connect to source and target AD domains via LDAP/LDAPS
- Browse and filter users and groups with search
- Configurable OU mapping between domains
- Conflict detection and resolution strategies
- Dry-run mode for safe validation
- Pause/resume/cancel migration in progress
- Pre and post-migration HTML reports
- CSV/JSON export of AD inventory
- PowerShell scripts usable independently of the UI
- Python-based data analysis for large environments
