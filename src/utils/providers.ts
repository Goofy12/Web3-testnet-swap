/* eslint-disable prefer-destructuring */
import { ethers } from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-use-before-define
const browserExtensionProvider = createBrowserExtensionProvider();

// Interfaces

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

// Provider and Wallet Functions

function createBrowserExtensionProvider(): ethers.providers.Web3Provider | null {
  try {
    const ethereum = window?.ethereum as any;
    if (!ethereum) return null;
    return new ethers.providers.Web3Provider(ethereum, 'any');
  } catch (e) {
    console.log('No Wallet Extension Found');
    return null;
  }
}
export function getProvider(): ethers.providers.Web3Provider | null {
  return createBrowserExtensionProvider();
}
// Transacting with a wallet extension via a Web3 Provider
async function sendTransactionViaExtension(
  transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
  try {
    const receipt = await browserExtensionProvider?.send(
      'eth_sendTransaction',
      [transaction]
    );
    if (receipt) {
      return TransactionState.Sent;
    }
    return TransactionState.Failed;
  } catch (e) {
    console.log(e);
    return TransactionState.Rejected;
  }
}

export async function sendTransaction(
  transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
  return sendTransactionViaExtension(transaction);
}
