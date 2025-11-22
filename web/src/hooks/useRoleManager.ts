import { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import toast from 'react-hot-toast';
import { handleContractError } from '../utils/errorHandler';

export function useRoleManager() {
  const { requestRole, cancelRequest, approveRole, rejectRole, revokeRole, refreshUser } =
    useWeb3();
  const [isLoading, setIsLoading] = useState(false);

  // Solicitar un rol
  const handleRequestRole = async (desiredRole: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      await requestRole(desiredRole);
      await refreshUser();

      // Si es admin (rol 5), hacer una actualización adicional después de un delay
      if (desiredRole === 5) {
        setTimeout(async () => {
          await refreshUser();
        }, 1000);
      }

      return true;
    } catch (error) {
      const errorMessage = handleContractError(error);
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
      const errorMessage = handleContractError(error);
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
      const errorMessage = handleContractError(error);
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
      const errorMessage = handleContractError(error);
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
      const errorMessage = handleContractError(error);
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
