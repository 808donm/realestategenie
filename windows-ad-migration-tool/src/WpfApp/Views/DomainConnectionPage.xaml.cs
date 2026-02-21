using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ADMigrationTool.Services;

namespace ADMigrationTool.Views
{
    public partial class DomainConnectionPage : Page
    {
        private readonly DomainType _domainType;

        public DomainConnectionPage(DomainType domainType)
        {
            InitializeComponent();
            _domainType = domainType;
            PageTitle.Text = $"Connect to {domainType} Domain";
        }

        private async void TestConnection_Click(object sender, RoutedEventArgs e)
        {
            ShowStatus("Testing connection...", isError: false);

            var result = await ActiveDirectoryService.TestConnectionAsync(
                DomainController.Text,
                DomainName.Text,
                Username.Text,
                Password.Password,
                UseSSL.IsChecked == true);

            ShowStatus(result.Message, !result.Success);
        }

        private async void Connect_Click(object sender, RoutedEventArgs e)
        {
            ShowStatus("Connecting...", isError: false);

            var result = await ActiveDirectoryService.ConnectAsync(
                _domainType,
                DomainController.Text,
                DomainName.Text,
                Username.Text,
                Password.Password,
                UseSSL.IsChecked == true);

            if (result.Success)
            {
                ShowStatus("Connected successfully!", isError: false);
                DomainInfoPanel.Visibility = Visibility.Visible;
                ForestName.Text = result.ForestName;
                DomainLevel.Text = result.DomainLevel;
                TotalUsers.Text = result.TotalUsers.ToString();
                TotalGroups.Text = result.TotalGroups.ToString();

                var mainWindow = Application.Current.MainWindow as MainWindow;
                mainWindow?.UpdateDomainStatus(_domainType, DomainName.Text, true);
            }
            else
            {
                ShowStatus(result.Message, isError: true);
            }
        }

        private void ShowStatus(string message, bool isError)
        {
            StatusBorder.Visibility = Visibility.Visible;
            StatusBorder.Background = new SolidColorBrush(
                isError ? Color.FromRgb(0xFF, 0xEB, 0xEE) : Color.FromRgb(0xE8, 0xF5, 0xE9));
            StatusMessage.Text = message;
            StatusMessage.Foreground = new SolidColorBrush(
                isError ? Color.FromRgb(0xC6, 0x28, 0x28) : Color.FromRgb(0x2E, 0x7D, 0x32));
        }
    }
}
