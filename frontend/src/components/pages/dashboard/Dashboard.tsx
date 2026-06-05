import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Settings, LogOut } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const stats = [
    { label: 'Total Users', value: '1,234', icon: Users, color: 'bg-blue-500' },
    { label: 'Total Orders', value: '856', icon: ShoppingCart, color: 'bg-green-500' },
    { label: 'Revenue', value: '$12,345', icon: LayoutDashboard, color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600">AgentMark</h1>
        </div>
        <nav className="mt-6">
          <a href="#" className="flex items-center px-6 py-3 text-gray-700 bg-indigo-50 border-r-4 border-indigo-600">
            <LayoutDashboard size={20} className="mr-3" />
            Dashboard
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <Users size={20} className="mr-3" />
            Users
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <ShoppingCart size={20} className="mr-3" />
            Orders
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
            <Settings size={20} className="mr-3" />
            Settings
          </a>
          <button onClick={() => navigate('/')} className="flex items-center w-full px-6 py-3 text-gray-600 hover:bg-gray-50">
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
          <p className="text-gray-600">No recent activity to display.</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
