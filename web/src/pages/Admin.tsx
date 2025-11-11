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
  const { isAdmin, roleManager } = useWeb3();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const roleLabel = (value: number) => {
    return ['None', 'Producer', 'Factory', 'Retailer', 'Consumer'][value] || 'Unknown';
  };

  const loadUsers = async () => {
    if (!roleManager) return;

    try {
  const addresses = new Set<string>();
  const events = await roleManager.queryFilter(roleManager.filters.RoleRequested());
      for (const ev of events) {
        const args = (ev as unknown as { args?: unknown[] }).args as unknown[] | undefined;
        const addr = (args && typeof args[0] === 'string') ? (args[0] as string) : undefined;
        if (addr) addresses.add(addr.toLowerCase());
      }

      const list: AdminUser[] = [];
      for (const addr of addresses) {
        try {
          const info = await roleManager.getUser(addr);
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
  }, [roleManager]);

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const handleApprove = async (address: string) => {
    if (!roleManager) return;
    setProcessing(address);
    try {
      const tx = await roleManager.approveRole(address);
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
    if (!roleManager) return;
    setProcessing(address);
    try {
      const tx = await roleManager.rejectRole(address);
      await tx.wait();
      await loadUsers();
    } catch (error) {
      console.error('rejectRole failed:', error);
      alert('Failed to reject role');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevoke = async (address: string) => {
    if (!roleManager) return;
    if (!confirm(`Are you sure you want to revoke access for ${address.slice(0,10)}...?`)) {
      return;
    }
    setProcessing(address);
    try {
      const tx = await roleManager.revokeRole(address);
      await tx.wait();
      await loadUsers();
    } catch (error) {
      console.error('revokeRole failed:', error);
      alert('Failed to revoke role');
    } finally {
      setProcessing(null);
    }
  };

  // const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'blue' },
    { label: 'Pending Approval', value: users.filter(u => !u.approved && u.requestedRole !== 0).length, icon: Clock, color: 'yellow' },
    { label: 'Approved', value: users.filter(u => u.approved).length, icon: CheckCircle, color: 'green' },
    { label: 'Rejected', value: users.filter(u => !u.approved && u.requestedRole === 0 && u.role === 0).length, icon: XCircle, color: 'red' },
  ];

  const pendingUsers = users.filter(u => !u.approved && u.requestedRole !== 0);
  const approvedUsers = users.filter(u => u.approved);
  const rejectedUsers = users.filter(u => !u.approved && u.requestedRole === 0 && u.role === 0);

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
              Approve or reject role requests from users
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
              <div className="space-y-6">
                {/* Pending Approvals Section */}
                {pendingUsers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      Pending Approval ({pendingUsers.length})
                    </h3>
                    <div className="space-y-3">
                      {pendingUsers.map((user) => {
                        const isProcessing = processing === user.address;
                        return (
                          <div
                            key={user.address}
                            className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-yellow-100">
                                <Clock className="w-5 h-5 text-yellow-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900">{user.address.slice(0,10)}...{user.address.slice(-8)}</span>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Requested: {roleLabel(user.requestedRole)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 font-mono">{user.address}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Approved Users Section */}
                {approvedUsers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Approved Users ({approvedUsers.length})
                    </h3>
                    <div className="space-y-3">
                      {approvedUsers.map((user) => {
                        const isProcessing = processing === user.address;
                        return (
                          <div
                            key={user.address}
                            className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-full bg-green-100">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900">{user.address.slice(0,10)}...{user.address.slice(-8)}</span>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {roleLabel(user.role)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 font-mono">{user.address}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="danger"
                                onClick={() => handleRevoke(user.address)}
                                disabled={isProcessing}
                                className="text-sm"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Revoke
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rejected Users Section */}
                {rejectedUsers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Rejected ({rejectedUsers.length})
                    </h3>
                    <div className="space-y-3">
                      {rejectedUsers.map((user) => (
                        <div
                          key={user.address}
                          className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-red-100">
                              <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{user.address.slice(0,10)}...{user.address.slice(-8)}</span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Rejected
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 font-mono">{user.address}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
