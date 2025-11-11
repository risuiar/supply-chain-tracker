import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';

type AdminUser = {
  address: string;
  approved: boolean;
  role: number; // 0 None, 1 Producer, 2 Factory, 3 Retailer, 4 Consumer
  requestedRole: number; // pending role if not approved yet
};

export function Admin() {
  const { isAdmin, contract } = useWeb3();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const roleLabel = (value: number) => {
    return ['None', 'Producer', 'Factory', 'Retailer', 'Consumer'][value] || 'Unknown';
  };

  const loadUsers = async () => {
    if (!contract) return;

    try {
  const addresses = new Set<string>();
  const events = await contract.queryFilter(contract.filters.RoleRequested());
      for (const ev of events) {
        const args = (ev as unknown as { args?: unknown[] }).args as unknown[] | undefined;
        const addr = (args && typeof args[0] === 'string') ? (args[0] as string) : undefined;
        if (addr) addresses.add(addr.toLowerCase());
      }

      const list: AdminUser[] = [];
      for (const addr of addresses) {
        try {
          const info = await contract.getUser(addr);
          list.push({
            address: addr,
            approved: info.approved,
            role: Number(info.role),
            requestedRole: Number(info.requestedRole),
          });
        } catch (e) {
          console.error('getUser failed for', addr, e);
        }
      }

      setUsers(list);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const handleApprove = async (address: string) => {
    if (!contract) return;
    setProcessing(address);
    try {
      const tx = await contract.approveRole(address);
      await tx.wait();
      await loadUsers();
    } catch (error) {
      console.error('approveRole failed:', error);
      alert('Failed to approve role');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (address: string) => {
    if (!contract) return;
    setProcessing(address);
    try {
      const tx = await contract.rejectRole(address);
      await tx.wait();
      await loadUsers();
    } catch (error) {
      console.error('rejectRole failed:', error);
      alert('Failed to reject role');
    } finally {
      setProcessing(null);
    }
  };

  // const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const stats = [
    { label: 'Total Requests', value: users.length, icon: Users, color: 'blue' },
    { label: 'Pending', value: users.filter(u => !u.approved && u.requestedRole !== 0).length, icon: Clock, color: 'yellow' },
    { label: 'Approved', value: users.filter(u => u.approved).length, icon: CheckCircle, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            Manage user registrations and status changes
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
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

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage user registrations and status changes
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
                <p className="text-gray-600">
                  Users will appear here after they register
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => {
                  const isProcessing = processing === user.address;

                  return (
                    <div
                      key={user.address}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${user.approved ? 'bg-green-100' : user.requestedRole !== 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                          {user.approved ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{user.address}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {user.approved ? 'Approved' : 'Pending'}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.approved ? roleLabel(user.role) : `Requested: ${roleLabel(user.requestedRole)}`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 font-mono">{user.address}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!user.approved && user.requestedRole !== 0 && (
                          <>
                            <Button
                              variant="success"
                              onClick={() => handleApprove(user.address)}
                              disabled={isProcessing}
                              className="text-sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleReject(user.address)}
                              disabled={isProcessing}
                              className="text-sm"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
