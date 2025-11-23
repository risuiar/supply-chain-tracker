import { useWeb3 } from '../contexts/Web3Context';
import { ROLE_NAMES, ROLE_COLORS } from '../constants/roles';

export function UserStatusBadge() {
  const { user, isConnected } = useWeb3();

  if (!isConnected) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
        Desconectado
      </div>
    );
  }

  if (!user || (user.role === 0 && user.requestedRole === 0)) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
        Sin rol asignado
      </div>
    );
  }

  // Usuario tiene solicitud pendiente
  if (user && user.requestedRole !== 0 && !user.approved) {
    return (
      <div className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          Solicitud pendiente: {ROLE_NAMES[user.requestedRole]}
        </div>
      </div>
    );
  }

  // Usuario tiene rol aprobado
  if (user && user.approved && user.role !== 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium">
        <span className={`px-3 py-1 rounded-full ${ROLE_COLORS[user.role]}`}>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>
          {ROLE_NAMES[user.role]} ✓
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
      Estado desconocido
    </div>
  );
}
