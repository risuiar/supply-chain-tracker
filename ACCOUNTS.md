# Test Accounts (Anvil Local Network)

## Quick Reference

| Role         | Address                                      | Private Key                                                          |
| ------------ | -------------------------------------------- | -------------------------------------------------------------------- |
| **Admin**    | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Producer** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Factory**  | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Retailer** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| **Consumer** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |

## How to Import Accounts in MetaMask

1. Open MetaMask extension
2. Click on the account icon (top right)
3. Click "Import Account"
4. Paste the **Private Key** from the table above
5. Click "Import"

## How to Switch Between Accounts

### ⚠️ IMPORTANT: MetaMask Account Switching

When you switch accounts in MetaMask, **the site may not automatically detect the change**.

**To properly switch accounts:**

1. Click **"Disconnect"** in the app header
2. Switch to the desired account in MetaMask
3. Click **"Connect MetaMask"** again

This forces MetaMask to reconnect with the currently selected account.

## Current Status

All accounts have been registered and approved on-chain:

- ✅ Admin account deployed the contract
- ✅ Producer requested role → Admin approved
- ✅ Factory requested role → Admin approved
- ✅ Retailer requested role → Admin approved
- ✅ Consumer requested role → Admin approved

## Testing Different Dashboards

- **Admin Account**: Redirected to Admin Panel with role approval interface
- **Producer Account**: Can create raw materials (assets)
- **Factory Account**: Can create processed goods from raw materials
- **Retailer Account**: Can receive transfers from Factory
- **Consumer Account**: Final destination in supply chain

## Network Configuration

- **RPC URL**: http://127.0.0.1:8545
- **Chain ID**: 31337 (Anvil default)
- **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## Troubleshooting

### "Account not changing in the app"

- Use Disconnect → Switch account in MetaMask → Reconnect
- Check browser console for `[Web3Context] Polling check` logs
- If MetaMask account matches State account in logs, the site is connected to that account

### "Not recognized as admin"

- Ensure you're using account `0xf39Fd...2266` (first in the table)
- Check console logs for `isAdmin check: { result: true }`

### "MetaMask keeps showing wrong account"

- MetaMask remembers the last connected account per site
- Clear site permissions in MetaMask settings if needed
- Or use the Disconnect/Reconnect workflow
