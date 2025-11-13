import { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';

// Mapeo de errores del contrato a mensajes en español
const ERROR_MESSAGES: Record<string, string> = {
  AlreadyHasRole: 'Ya tienes un rol aprobado',
  RoleAlreadyRequested: 'Ya tienes una solicitud pendiente',
  RoleNotRequested: 'No hay ninguna solicitud para cancelar',
  NotApproved: 'No tienes un rol aprobado',
  InvalidRoleRequest: 'Rol solicitado no válido',
  NotAdmin: 'Solo el administrador puede hacer esta acción',
};

export function useRoleManager() {
  const { requestRole, cancelRequest, approveRole, rejectRole, revokeRole, refreshUser } =
    useWeb3();
  const [isLoading, setIsLoading] = useState(false);

  // Helper para extraer y traducir errores del contrato
  const handleError = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message: string }).message;

      // Buscar el nombre del error personalizado en el mensaje
      for (const [errorName, translatedMessage] of Object.entries(ERROR_MESSAGES)) {
        if (message.includes(errorName)) {
          return translatedMessage;
        }
      }

      // Si es un error de rechazo del usuario
      if (message.includes('user rejected') || message.includes('User denied')) {
        return 'Transacción cancelada por el usuario';
      }

      // Si no es un error conocido, devolver el mensaje original
      return 'Error en la transacción. Por favor intenta de nuevo.';
    }

    return 'Error desconocido';
  };

  // Solicitar un rol
  const handleRequestRole = async (desiredRole: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      await requestRole(desiredRole);
      await refreshUser();
      return true;
    } catch (error) {
      const errorMessage = handleError(error);
      toast.error(errorMessage);
      console.error('Error requesting role:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Cancelar solicitud pendiente
  const handleCancelRequest = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      await cancelRequest();
      await refreshUser();
      return true;
    } catch (error) {
      const errorMessage = handleError(error);
      toast.error(errorMessage);
      console.error('Error canceling request:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Aprobar rol de un usuario (admin)
  const handleApproveRole = async (userAccount: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await approveRole(userAccount);
      return true;
    } catch (error) {
      const errorMessage = handleError(error);
      toast.error(errorMessage);
      console.error('Error approving role:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Rechazar solicitud de rol (admin)
  const handleRejectRole = async (userAccount: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await rejectRole(userAccount);
      return true;
    } catch (error) {
      const errorMessage = handleError(error);
      toast.error(errorMessage);
      console.error('Error rejecting role:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Revocar rol de un usuario (admin)
  const handleRevokeRole = async (userAccount: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await revokeRole(userAccount);
      return true;
    } catch (error) {
      const errorMessage = handleError(error);
      toast.error(errorMessage);
      console.error('Error revoking role:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    requestRole: handleRequestRole,
    cancelRequest: handleCancelRequest,
    approveRole: handleApproveRole,
    rejectRole: handleRejectRole,
    revokeRole: handleRevokeRole,
    isLoading,
  };
}
