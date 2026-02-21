using System.Windows;
using System.Windows.Controls;

namespace ADMigrationTool.Views
{
    public partial class UsersGroupsPage : Page
    {
        public UsersGroupsPage()
        {
            InitializeComponent();
        }

        private async void Refresh_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Refresh users and groups from connected source domain
        }

        private void SelectAll_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Select all visible items
        }

        private void DeselectAll_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Deselect all items
        }

        private void ExportCsv_Click(object sender, RoutedEventArgs e)
        {
            // TODO: Export current view to CSV
        }

        private void SearchBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            // TODO: Filter displayed users/groups
        }
    }
}
