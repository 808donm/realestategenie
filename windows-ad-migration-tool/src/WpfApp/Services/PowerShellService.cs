using Microsoft.Extensions.Logging;

namespace ADMigrationTool.Services
{
    /// <summary>
    /// Runs PowerShell scripts from the .NET WPF app using System.Management.Automation.
    /// This bridges the desktop UI with the PowerShell AD migration modules.
    /// </summary>
    public class PowerShellService
    {
        private readonly ILogger _logger;
        private readonly string _scriptsPath;

        public PowerShellService()
        {
            _logger = App.LoggerFactory.CreateLogger<PowerShellService>();
            _scriptsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "PowerShell", "Scripts");
        }

        /// <summary>
        /// Execute a PowerShell script file with the given parameters.
        /// </summary>
        public async Task<PowerShellResult> RunScriptAsync(string scriptName, Dictionary<string, object>? parameters = null)
        {
            var scriptPath = Path.Combine(_scriptsPath, scriptName);

            if (!File.Exists(scriptPath))
            {
                return new PowerShellResult
                {
                    Success = false,
                    ErrorMessage = $"Script not found: {scriptPath}"
                };
            }

            return await Task.Run(() =>
            {
                try
                {
                    _logger.LogInformation("Executing PowerShell script: {Script}", scriptName);

                    // TODO: Implement using System.Management.Automation
                    // using var ps = PowerShell.Create();
                    // ps.AddScript(File.ReadAllText(scriptPath));
                    // if (parameters != null)
                    //     foreach (var param in parameters)
                    //         ps.AddParameter(param.Key, param.Value);
                    // var results = ps.Invoke();

                    return new PowerShellResult { Success = true };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "PowerShell script failed: {Script}", scriptName);
                    return new PowerShellResult
                    {
                        Success = false,
                        ErrorMessage = ex.Message
                    };
                }
            });
        }

        /// <summary>
        /// Execute a raw PowerShell command string.
        /// </summary>
        public async Task<PowerShellResult> RunCommandAsync(string command)
        {
            return await Task.Run(() =>
            {
                try
                {
                    _logger.LogInformation("Executing PowerShell command: {Command}", command);

                    // TODO: Implement using System.Management.Automation
                    return new PowerShellResult { Success = true };
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "PowerShell command failed");
                    return new PowerShellResult
                    {
                        Success = false,
                        ErrorMessage = ex.Message
                    };
                }
            });
        }
    }

    public class PowerShellResult
    {
        public bool Success { get; set; }
        public string Output { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
        public List<object> Results { get; set; } = new();
    }
}
