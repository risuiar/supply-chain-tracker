import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider, useWeb3 } from './contexts/Web3Context';
import { Header } from './components/Header';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Tokens } from './pages/Tokens';
import { CreateToken } from './pages/CreateToken';
import { TokenDetails } from './pages/TokenDetails';
import { TransferToken } from './pages/TransferToken';
import { Transfers } from './pages/Transfers';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
// import { UserStatus } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useWeb3();

  if (!user || !user.approved) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useWeb3();
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isConnected, isAdmin } = useWeb3();

  return (
    <>
      {isConnected && <Header />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            isAdmin ? (
              <AdminOnlyRoute>
                <Admin />
              </AdminOnlyRoute>
            ) : (
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/tokens"
          element={
            <ProtectedRoute>
              <Tokens />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tokens/create"
          element={
            <ProtectedRoute>
              <CreateToken />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tokens/:id"
          element={
            <ProtectedRoute>
              <TokenDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tokens/:id/transfer"
          element={
            <ProtectedRoute>
              <TransferToken />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <Transfers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminOnlyRoute>
              <Admin />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <AppRoutes />
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
