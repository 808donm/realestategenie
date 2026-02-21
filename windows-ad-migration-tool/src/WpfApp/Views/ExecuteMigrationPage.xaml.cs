using System.Windows;
using System.Windows.Controls;

namespace ADMigrationTool.Views
{
    public partial class ExecuteMigrationPage : Page
    {
        public ExecuteMigrationPage()
        {
            InitializeComponent();
        }

        private async void DryRun_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Execute migration in dry-run mode (no changes made)
        }

        private async void Start_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Start actual migration process
        }

        private void Pause_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Pause migration
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Cancel migration with rollback option
        }
    }
}
