using ADMigrationTool.Models;
using Microsoft.Extensions.Logging;

namespace ADMigrationTool.Services
{
    /// <summary>
    /// Core migration engine. Orchestrates user/group migration between domains.
    /// Calls PowerShell scripts for operations requiring elevated AD privileges.
    /// </summary>
    public class MigrationService
    {
        private readonly ILogger _logger;
        private readonly PowerShellService _psService;
        private CancellationTokenSource? _cancellationTokenSource;
        private bool _isPaused;

        public event Action<int, int, string>? ProgressChanged;
        public event Action<string>? LogMessage;

        public MigrationService()
        {
            _logger = App.LoggerFactory.CreateLogger<MigrationService>();
            _psService = new PowerShellService();
        }

        public async Task<MigrationResult> ExecuteAsync(MigrationPlan plan, bool dryRun = false)
        {
            _cancellationTokenSource = new CancellationTokenSource();
            var result = new MigrationResult();
            var startTime = DateTime.UtcNow;

            try
            {
                var prefix = dryRun ? "[DRY RUN] " : "";
                LogMessage?.Invoke($"{prefix}Starting migration...");

                // Phase 1: Migrate Groups
                LogMessage?.Invoke($"{prefix}Phase 1: Migrating groups...");
                await MigrateGroupsAsync(plan, result, dryRun);

                // Phase 2: Migrate Users
                LogMessage?.Invoke($"{prefix}Phase 2: Migrating users...");
                await MigrateUsersAsync(plan, result, dryRun);

                // Phase 3: Restore Group Memberships
                if (plan.Options.MigrateGroupMemberships)
                {
                    LogMessage?.Invoke($"{prefix}Phase 3: Restoring group memberships...");
                    await RestoreGroupMembershipsAsync(plan, result, dryRun);
                }

                // Phase 4: Post-migration tasks
                if (plan.Options.DisableSourceAccounts && !dryRun)
                {
                    LogMessage?.Invoke("Phase 4: Disabling source accounts...");
                    await DisableSourceAccountsAsync(plan, result);
                }

                result.Success = result.Failed == 0;
            }
            catch (OperationCanceledException)
            {
                LogMessage?.Invoke("Migration cancelled by user.");
                result.Success = false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Migration failed");
                LogMessage?.Invoke($"Migration failed: {ex.Message}");
                result.Success = false;
            }

            result.Duration = DateTime.UtcNow - startTime;
            LogMessage?.Invoke($"Migration completed in {result.Duration.TotalMinutes:F1} minutes. " +
                             $"Succeeded: {result.Succeeded}, Failed: {result.Failed}, Skipped: {result.Skipped}");

            return result;
        }

        public void Pause() => _isPaused = true;
        public void Resume() => _isPaused = false;
        public void Cancel() => _cancellationTokenSource?.Cancel();

        private async Task MigrateGroupsAsync(MigrationPlan plan, MigrationResult result, bool dryRun)
        {
            var total = plan.SelectedGroupDNs.Count;
            for (int i = 0; i < total; i++)
            {
                await WaitIfPausedAsync();
                _cancellationTokenSource?.Token.ThrowIfCancellationRequested();

                var groupDN = plan.SelectedGroupDNs[i];
                ProgressChanged?.Invoke(i + 1, total, $"Migrating group: {groupDN}");

                try
                {
                    if (!dryRun)
                    {
                        // TODO: Call PowerShell script to migrate group
                        // await _psService.RunScriptAsync("Migrate-ADGroup.ps1", parameters);
                    }

                    result.Succeeded++;
                    result.Log.Add(new MigrationLogEntry
                    {
                        Timestamp = DateTime.UtcNow,
                        ObjectName = groupDN,
                        ObjectType = "Group",
                        Status = MigrationStatus.Succeeded
                    });
                }
                catch (Exception ex)
                {
                    result.Failed++;
                    result.Log.Add(new MigrationLogEntry
                    {
                        Timestamp = DateTime.UtcNow,
                        ObjectName = groupDN,
                        ObjectType = "Group",
                        Status = MigrationStatus.Failed,
                        ErrorMessage = ex.Message
                    });
                }

                result.TotalProcessed++;
            }
        }

        private async Task MigrateUsersAsync(MigrationPlan plan, MigrationResult result, bool dryRun)
        {
            var total = plan.SelectedUserDNs.Count;
            for (int i = 0; i < total; i++)
            {
                await WaitIfPausedAsync();
                _cancellationTokenSource?.Token.ThrowIfCancellationRequested();

                var userDN = plan.SelectedUserDNs[i];
                ProgressChanged?.Invoke(i + 1, total, $"Migrating user: {userDN}");

                try
                {
                    if (!dryRun)
                    {
                        // TODO: Call PowerShell script to migrate user
                        // await _psService.RunScriptAsync("Migrate-ADUser.ps1", parameters);
                    }

                    result.Succeeded++;
                    result.Log.Add(new MigrationLogEntry
                    {
                        Timestamp = DateTime.UtcNow,
                        ObjectName = userDN,
                        ObjectType = "User",
                        Status = MigrationStatus.Succeeded
                    });
                }
                catch (Exception ex)
                {
                    result.Failed++;
                    result.Log.Add(new MigrationLogEntry
                    {
                        Timestamp = DateTime.UtcNow,
                        ObjectName = userDN,
                        ObjectType = "User",
                        Status = MigrationStatus.Failed,
                        ErrorMessage = ex.Message
                    });
                }

                result.TotalProcessed++;
            }
        }

        private Task RestoreGroupMembershipsAsync(MigrationPlan plan, MigrationResult result, bool dryRun)
        {
            // TODO: Re-add users to groups in target domain
            return Task.CompletedTask;
        }

        private Task DisableSourceAccountsAsync(MigrationPlan plan, MigrationResult result)
        {
            // TODO: Disable migrated accounts in source domain
            return Task.CompletedTask;
        }

        private async Task WaitIfPausedAsync()
        {
            while (_isPaused)
            {
                await Task.Delay(500);
            }
        }
    }
}
