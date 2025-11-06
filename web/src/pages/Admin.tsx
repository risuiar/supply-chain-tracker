import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, CheckCircle, XCircle, Clock, UserX } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { Card, CardContent, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { User, UserStatus } from '../types';

export function Admin() {
  const { isAdmin, contract } = useWeb3();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadUsers = async () => {
    if (!contract) return;

    try {
      const nextUserId = await contract.nextUserId();
      const userPromises = [];

      for (let i = 1n; i < nextUserId; i++) {
        userPromises.push(
          contract.getUserInfo(`0x${i.toString(16).padStart(40, '0')}`).catch(() => null)
        );
      }

      const allUsers: User[] = [];
      const addresses = new Set<string>();

      const events = await contract.queryFilter(contract.filters.UserRoleRequested());
      for (const event of events) {
        const address = event.args?.[0];
        if (address && !addresses.has(address.toLowerCase())) {
          addresses.add(address.toLowerCase());
          try {
            const userInfo = await contract.getUserInfo(address);
            if (userInfo.id > 0n) {
              allUsers.push({
                id: userInfo.id,
                userAddress: userInfo.userAddress,
                role: userInfo.role,
                status: Number(userInfo.status) as UserStatus,
              });
            }
          } catch (error) {
            console.error('Error loading user:', error);
          }
        }
      }

      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [contract]);

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const handleChangeStatus = async (address: string, newStatus: UserStatus) => {
    if (!contract) return;

    setProcessing(address);
    try {
      const tx = await contract.changeStatusUser(address, newStatus);
      await tx.wait();
      await loadUsers();
    } catch (error) {
      console.error('Error changing user status:', error);
      alert('Failed to change user status');
    } finally {
      setProcessing(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'blue',
    },
    {
      label: 'Pending',
      value: users.filter(u => u.status === UserStatus.Pending).length,
      icon: Clock,
      color: 'yellow',
    },
    {
      label: 'Approved',
      value: users.filter(u => u.status === UserStatus.Approved).length,
      icon: CheckCircle,
      color: 'green',
    },
    {
      label: 'Rejected',
      value: users.filter(u => u.status === UserStatus.Rejected).length,
      icon: XCircle,
      color: 'red',
    },
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
                  const isProcessing = processing === user.userAddress;

                  return (
                    <div
                      key={user.userAddress}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          user.status === UserStatus.Approved
                            ? 'bg-green-100'
                            : user.status === UserStatus.Pending
                            ? 'bg-yellow-100'
                            : 'bg-red-100'
                        }`}>
                          {user.status === UserStatus.Approved ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : user.status === UserStatus.Pending ? (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              User #{user.id.toString()}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.status === UserStatus.Approved
                                  ? 'bg-green-100 text-green-800'
                                  : user.status === UserStatus.Pending
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.status === UserStatus.Approved
                                ? 'Approved'
                                : user.status === UserStatus.Pending
                                ? 'Pending'
                                : user.status === UserStatus.Rejected
                                ? 'Rejected'
                                : 'Canceled'}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 font-mono">
                            {user.userAddress}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {user.status !== UserStatus.Approved && (
                          <Button
                            variant="success"
                            onClick={() => handleChangeStatus(user.userAddress, UserStatus.Approved)}
                            disabled={isProcessing}
                            className="text-sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {user.status === UserStatus.Pending && (
                          <Button
                            variant="danger"
                            onClick={() => handleChangeStatus(user.userAddress, UserStatus.Rejected)}
                            disabled={isProcessing}
                            className="text-sm"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        )}
                        {user.status === UserStatus.Approved && (
                          <Button
                            variant="danger"
                            onClick={() => handleChangeStatus(user.userAddress, UserStatus.Canceled)}
                            disabled={isProcessing}
                            className="text-sm"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Revoke
                          </Button>
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
