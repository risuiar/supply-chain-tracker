import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { UserStatus } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useWeb3();

  if (!user || user.status !== UserStatus.Approved) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isConnected } = useWeb3();

  return (
    <>
      {isConnected && <Header />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
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
        <AppRoutes />
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
