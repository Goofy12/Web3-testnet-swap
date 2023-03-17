/* eslint-disable prefer-destructuring */
import type { BaseProvider } from '@ethersproject/providers';
import type { providers } from 'ethers';
import { ethers } from 'ethers';

// eslint-disable-next-line @typescript-eslint/no-use-before-define
const browserExtensionProvider = createBrowserExtensionProvider();
let walletExtensionAddress: string | null = null;

// Interfaces

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

// Provider and Wallet Functions

export function getMainnetProvider(): BaseProvider {
  return mainnetProvider;
}

export function getWalletAddress(): string | null {
  return walletExtensionAddress;
}

export async function connectBrowserExtensionWallet() {
  if (!window.ethereum) {
    return null;
  }

  const { ethereum } = window;
  const provider = new ethers.providers.Web3Provider(ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);

  if (accounts.length !== 1) {
    // eslint-disable-next-line consistent-return
    return;
  }

  walletExtensionAddress = accounts[0];
  return walletExtensionAddress;
}

function createBrowserExtensionProvider(): ethers.providers.Web3Provider | null {
  try {
    return new ethers.providers.Web3Provider(window?.ethereum, 'any');
  } catch (e) {
    console.log('No Wallet Extension Found');
    return null;
  }
}
export function getProvider(): providers.Provider | null {
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
