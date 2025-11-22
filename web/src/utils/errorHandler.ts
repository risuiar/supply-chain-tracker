export function handleContractError(error: unknown): string {
  console.error('Contract Error:', error);

  if (typeof error === 'object' && error !== null && 'reason' in error) {
    return (error as { reason: string }).reason;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: string }).message;

    if (message.includes('User rejected the request')) {
      return 'Transaction rejected by user.';
    }

    if (message.includes('NotApproved')) {
      return 'You are not approved to perform this action.';
    }

    if (message.includes('Unauthorized')) {
      return 'You are not authorized to perform this action.';
    }

    if (message.includes('InsufficientBalance')) {
      return 'Insufficient token balance.';
    }

    if (message.includes('AssetDoesNotExist')) {
      return 'The specified asset does not exist.';
    }

    // Extract revert reason if present in the message string
    const revertMatch = message.match(/execution reverted: (.*?)"/);
    if (revertMatch) {
      return revertMatch[1];
    }

    return message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred.';
}
