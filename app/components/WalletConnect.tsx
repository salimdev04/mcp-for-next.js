'use client';

import { useState, useEffect } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { monadTestnet } from 'viem/chains';

// Add type definitions for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

interface WalletConnectProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
  onTransfer?: (txHash: string) => void;
}

export default function WalletConnect({ onConnect, onDisconnect, onTransfer }: WalletConnectProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Check if MetaMask is available
  const isMetaMaskAvailable = typeof window !== 'undefined' && window.ethereum;

  // Connect wallet function
  const connectWallet = async () => {
    if (!isMetaMaskAvailable) {
      setError('MetaMask is not installed. Please install MetaMask to use this feature.');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Request account access
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      
      // Check if we got any accounts
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        onConnect(accounts[0]);
        
        // Request to switch to Monad Testnet
        try {
          await window.ethereum!.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x3333' }], // Monad Testnet chainId
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum!.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x3333',
                    chainName: 'Monad Testnet',
                    nativeCurrency: {
                      name: 'MON',
                      symbol: 'MON',
                      decimals: 18,
                    },
                    rpcUrls: ['https://rpc.testnet.monad.xyz/'],
                    blockExplorerUrls: ['https://explorer.testnet.monad.xyz/'],
                  },
                ],
              });
            } catch (addError) {
              setError(`Error adding Monad Testnet: ${addError instanceof Error ? addError.message : String(addError)}`);
            }
          } else {
            setError(`Error switching to Monad Testnet: ${switchError.message}`);
          }
        }
      }
    } catch (err) {
      setError(`Error connecting wallet: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAccount(null);
    onDisconnect();
  };

  // Transfer tokens function
  const transferTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !recipientAddress || !amount) {
      setError('Please connect wallet, enter recipient address and amount');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setTxHash(null);

      // Create wallet client
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum!),
      });

      // Send transaction
      const hash = await walletClient.sendTransaction({
        account: account as `0x${string}`,
        to: recipientAddress as `0x${string}`,
        value: parseEther(amount),
      });

      setTxHash(hash);
      if (onTransfer) {
        onTransfer(hash);
      }
      
      // Reset form
      setRecipientAddress('');
      setAmount('');
    } catch (err) {
      setError(`Error sending transaction: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskAvailable) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setAccount(null);
          onDisconnect();
        } else if (accounts[0] !== account) {
          // User switched accounts
          setAccount(accounts[0]);
          onConnect(accounts[0]);
        }
      };

      window.ethereum!.on('accountsChanged', handleAccountsChanged);

      // Cleanup
      return () => {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [account, onConnect, onDisconnect]);

  return (
    <div className="space-y-6">
      {!account ? (
        <div>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="wallet-btn-primary disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          {!isMetaMaskAvailable && (
            <p className="mt-2 text-sm text-red-600">
              MetaMask is not installed. Please install MetaMask to use this feature.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Connected Wallet</div>
              <div className="font-medium">{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</div>
            </div>
            <button
              onClick={disconnectWallet}
              className="wallet-btn-secondary text-sm"
            >
              Disconnect
            </button>
          </div>

          <form onSubmit={transferTokens} className="space-y-4">
            <div>
              <label className="wallet-label">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="wallet-input"
                required
              />
            </div>
            
            <div>
              <label className="wallet-label">Amount (MON)</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.01"
                className="wallet-input"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isSending}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isSending ? 'Sending...' : 'Send MON'}
            </button>
          </form>

          {txHash && (
            <div className="wallet-card-success">
              <div className="text-sm font-medium text-green-800">Transaction sent!</div>
              <div className="text-xs text-green-700 break-all mt-1">
                Transaction Hash: {txHash}
              </div>
              <a
                href={`https://explorer.testnet.monad.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                View on Explorer
              </a>
            </div>
          )}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
