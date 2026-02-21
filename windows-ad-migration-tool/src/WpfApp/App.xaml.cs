using System.Windows;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ADMigrationTool
{
    public partial class App : Application
    {
        public static IConfiguration Configuration { get; private set; } = null!;
        public static ILoggerFactory LoggerFactory { get; private set; } = null!;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            Configuration = new ConfigurationBuilder()
                .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .Build();

            LoggerFactory = Microsoft.Extensions.Logging.LoggerFactory.Create(builder =>
            {
                builder.AddConsole();
                builder.SetMinimumLevel(LogLevel.Information);
            });
        }
    }
}
