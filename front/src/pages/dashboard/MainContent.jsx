// import Customer from "./pages/ServiceManger";
import Dashboard from "./pages/dashboard";
// import S_Transaction from "./pages/RentManager";
import Report from "./pages/reports";
import AddUser from "./pages/AddUser";
import ExpenseManager from "./pages/expense/ExpenseManages.jsx"
import ZoneManager from "./pages/management/ZoneManager";
import PriceListManager from "./pages/management/PriceList";
import StaffManager from "./pages/salary/StaffManager.jsx";
import Salary from "./pages/salary/Salary.jsx";
import AddBill from "./pages/order/AddBill.jsx";
import BillsPage from "./pages/order/BillsPage.jsx";
import Customers from "./pages/customer/Customers.jsx";
import CustomersPage from "./pages/customer/CustomersPage.jsx";
import ValetsPage from "./pages/valet/ValetsPage.jsx";
import WalletPage from "./pages/valet/WalletPage.jsx";
import Orders from "./pages/Orders/Orders.jsx";
const MainContent = ({ activeComponent }) => {
  const renderContent = () => {
    switch (activeComponent) {
      case "dashboard":
        return <Dashboard />;
      case "ZoneManagement":
        return <ZoneManager />;
      case "order":
        return <Orders />;
      case "ُSalaries":
        return <Salary />;
      case "ExpenseManager":
        return <ExpenseManager />;
      case "BlockManager":
        return <BlockManager />;
      case "user managements":
        return <UserManagement />;
      case "report":
        return <Report />;
      case "Salaries":
        return <Salaries />;
      case "setting":
        return <Setting />;
      case "holders":
        return <WalletPage />;
      case "Fees":
        return <Fees />;
      case "Customers":
        return <CustomersPage />;
      case "PackageList":
        return <Pack />;
      case "AddUser":
        return <AddUser />;

      default:
        return <Dashboard />;
    }
  };

  return <div className="min-h-[90vh]">{renderContent()}</div>;
};

export default MainContent;
