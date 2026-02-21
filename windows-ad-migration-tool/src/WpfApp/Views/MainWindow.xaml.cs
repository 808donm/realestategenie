using System.Windows;

namespace ADMigrationTool.Views
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            ContentFrame.Navigate(new DashboardPage());
        }

        private void NavDashboard_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new DashboardPage());

        private void NavSourceDomain_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new DomainConnectionPage(DomainType.Source));

        private void NavTargetDomain_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new DomainConnectionPage(DomainType.Target));

        private void NavUsersGroups_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new UsersGroupsPage());

        private void NavMigrationPlan_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new MigrationPlanPage());

        private void NavExecuteMigration_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new ExecuteMigrationPage());

        private void NavReports_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new ReportsPage());

        private void NavSettings_Click(object sender, RoutedEventArgs e)
            => ContentFrame.Navigate(new SettingsPage());

        public void UpdateStatus(string message)
        {
            StatusText.Text = message;
        }

        public void UpdateDomainStatus(DomainType type, string domainName, bool connected)
        {
            var label = type == DomainType.Source ? SourceDomainLabel : TargetDomainLabel;
            var prefix = type == DomainType.Source ? "Source" : "Target";

            if (connected)
            {
                label.Text = $"{prefix}: {domainName}";
                label.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0xA5, 0xD6, 0xA7));
            }
            else
            {
                label.Text = $"{prefix}: Not Connected";
                label.Foreground = new System.Windows.Media.SolidColorBrush(
                    System.Windows.Media.Color.FromRgb(0xEF, 0x9A, 0x9A));
            }
        }
    }

    public enum DomainType
    {
        Source,
        Target
    }
}
