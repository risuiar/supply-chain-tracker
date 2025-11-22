import { renderHook, act } from '@testing-library/react';
import { useRoleManager } from '../hooks/useRoleManager';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('react-hot-toast');

const mockRequestRole = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('../contexts/Web3Context', () => ({
  useWeb3: () => ({
    requestRole: mockRequestRole,
    cancelRequest: vi.fn(),
    approveRole: vi.fn(),
    rejectRole: vi.fn(),
    revokeRole: vi.fn(),
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
});
