import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Package, Send, Clock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';

export function Dashboard() {
  const { user, account } = useWeb3();

  useEffect(() => {
    console.log('[Dashboard] Current account:', account);
    console.log('[Dashboard] Current user state:', user);
  }, [user, account]);

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  const roleName = (r: number) => ['None','Producer','Factory','Retailer','Consumer'][r] || 'Unknown';

  const stats = [
    { label: 'My Tokens', value: 0, icon: Package, color: 'blue' },
    { label: 'Pending Transfers', value: 0, icon: Clock, color: 'yellow' },
    { label: 'Total Transfers', value: 0, icon: Send, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {roleName(user.role)}
          </h1>
          <p className="text-gray-600">
            Manage your supply chain operations from this dashboard
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(user.role === 1 || user.role === 2) && (
                <Link to="/tokens/create">
                  <Button className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    Create New Token
                  </Button>
                </Link>
              )}
              <Link to="/tokens">
                <Button variant="secondary" className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  View My Tokens
                </Button>
              </Link>
              <Link to="/transfers">
                <Button variant="secondary" className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Manage Transfers
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
