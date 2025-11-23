import { renderHook, act } from '@testing-library/react';
import { useRoleManager } from '../hooks/useRoleManager';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('react-hot-toast');

const mockRequestRole = vi.fn();
const mockCancelRequest = vi.fn();
const mockApproveRole = vi.fn();
const mockRejectRole = vi.fn();
const mockRevokeRole = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('../contexts/Web3Context', () => ({
  useWeb3: () => ({
    requestRole: mockRequestRole,
    cancelRequest: mockCancelRequest,
    approveRole: mockApproveRole,
    rejectRole: mockRejectRole,
    revokeRole: mockRevokeRole,
    refreshUser: mockRefreshUser,
  }),
}));

describe('useRoleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully request a role', async () => {
    mockRequestRole.mockResolvedValue(undefined);
    mockRefreshUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.requestRole(1);
    });

    expect(success).toBe(true);
    expect(mockRequestRole).toHaveBeenCalledWith(1);
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should handle errors when requesting a role', async () => {
    const error = new Error('User rejected the request');
    mockRequestRole.mockRejectedValue(error);

    // Suppress console.error for this test as we expect an error to be logged
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.requestRole(1);
    });

    expect(success).toBe(false);
    expect(mockRequestRole).toHaveBeenCalledWith(1);
    expect(toast.error).toHaveBeenCalledWith('Transaction rejected by user.');

    // Verify console.error was called but suppressed
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should successfully cancel a request', async () => {
    mockCancelRequest.mockResolvedValue(undefined);
    mockRefreshUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.cancelRequest();
    });

    expect(success).toBe(true);
    expect(mockCancelRequest).toHaveBeenCalled();
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should handle errors when canceling a request', async () => {
    const error = new Error('Transaction failed');
    mockCancelRequest.mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.cancelRequest();
    });

    expect(success).toBe(false);
    expect(mockCancelRequest).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should successfully approve a role', async () => {
    mockApproveRole.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.approveRole('0x123');
    });

    expect(success).toBe(true);
    expect(mockApproveRole).toHaveBeenCalledWith('0x123');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should handle errors when approving a role', async () => {
    const error = new Error('Approval failed');
    mockApproveRole.mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.approveRole('0x123');
    });

    expect(success).toBe(false);
    expect(mockApproveRole).toHaveBeenCalledWith('0x123');
    expect(toast.error).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should successfully reject a role', async () => {
    mockRejectRole.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.rejectRole('0x123');
    });

    expect(success).toBe(true);
    expect(mockRejectRole).toHaveBeenCalledWith('0x123');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should handle errors when rejecting a role', async () => {
    const error = new Error('Rejection failed');
    mockRejectRole.mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.rejectRole('0x123');
    });

    expect(success).toBe(false);
    expect(mockRejectRole).toHaveBeenCalledWith('0x123');
    expect(toast.error).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should successfully revoke a role', async () => {
    mockRevokeRole.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.revokeRole('0x123');
    });

    expect(success).toBe(true);
    expect(mockRevokeRole).toHaveBeenCalledWith('0x123');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should handle errors when revoking a role', async () => {
    const error = new Error('Revocation failed');
    mockRevokeRole.mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRoleManager());

    let success;
    await act(async () => {
      success = await result.current.revokeRole('0x123');
    });

    expect(success).toBe(false);
    expect(mockRevokeRole).toHaveBeenCalledWith('0x123');
    expect(toast.error).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should set isLoading to true during request', async () => {
    mockRequestRole.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
    mockRefreshUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoleManager());

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.requestRole(1);
    });

    // isLoading should be true during the request
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    // isLoading should be false after completion
    expect(result.current.isLoading).toBe(false);
  });
});
