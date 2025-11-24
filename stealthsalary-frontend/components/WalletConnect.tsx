"use client";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

export function WalletConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Silent restore on mount
  useEffect(() => {
    const anyWindow: any = window as any;
    const providers: any[] = anyWindow?.ethereum?.providers || (anyWindow?.ethereum ? [anyWindow.ethereum] : []);
    const lastConnectorId = localStorage.getItem("wallet.lastConnectorId");
    let selected: any = undefined;
    
    if (lastConnectorId && Array.isArray(providers)) {
      selected = providers.find((p: any) => p?.id === lastConnectorId);
    }
    if (!selected) selected = providers[0];
    if (!selected) return;

    const p = new ethers.BrowserProvider(selected, "any");
    p.send("eth_accounts", []).then(async (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        const net = await p.getNetwork();
        setChainId(Number(net.chainId));
      }
    });

    // Listen for changes
    selected.on?.("accountsChanged", (accs: string[]) => {
      if (accs && accs.length > 0) {
        setAccount(accs[0]);
      } else {
        setAccount(null);
        setChainId(null);
      }
    });
    selected.on?.("chainChanged", async (cid: string | number) => {
      const cidNum = typeof cid === "string" ? parseInt(cid, 16) : cid;
      setChainId(cidNum);
    });
  }, []);

  const connect = async () => {
    const anyWindow: any = window as any;
    const providers: any[] = anyWindow?.ethereum?.providers || (anyWindow?.ethereum ? [anyWindow.ethereum] : []);
    const lastConnectorId = localStorage.getItem("wallet.lastConnectorId");
    let selected: any = undefined;
    
    if (lastConnectorId && Array.isArray(providers)) {
      selected = providers.find((p: any) => p?.id === lastConnectorId);
    }
    if (!selected) selected = providers[0];
    
    if (!selected) {
      alert("No wallet found. Please install MetaMask or another Web3 wallet.");
      return;
    }

    try {
      setConnecting(true);
      const provider = new ethers.BrowserProvider(selected, "any");
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        const signer = await provider.getSigner();
        const net = await provider.getNetwork();
        setChainId(Number(net.chainId));
        
        // Persist
        localStorage.setItem("wallet.connected", "true");
        localStorage.setItem("wallet.lastAccounts", JSON.stringify(accounts));
        localStorage.setItem("wallet.lastChainId", String(Number(net.chainId)));
        if (selected.id) localStorage.setItem("wallet.lastConnectorId", selected.id);
      }
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      if (error.code === 4001) {
        alert("Connection rejected. Please approve the connection request.");
      } else {
        alert(`Failed to connect: ${error.message || "Unknown error"}`);
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem("wallet.connected");
    localStorage.removeItem("wallet.lastAccounts");
    localStorage.removeItem("wallet.lastChainId");
    localStorage.removeItem("wallet.lastConnectorId");
    if (account) {
      localStorage.removeItem(`fhevm.decryptionSignature.${account}`);
    }
    setAccount(null);
    setChainId(null);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!account) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="btn-primary px-4 py-2 text-sm"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 text-sm">
        <div className="px-3 py-1.5 glass-sm rounded border border-white/10">
          <span className="text-gray-300">{formatAddress(account)}</span>
        </div>
        {chainId && (
          <div className="px-3 py-1.5 glass-sm rounded border border-white/10">
            <span className="text-gray-300">Chain: {chainId}</span>
          </div>
        )}
      </div>
      <button
        onClick={disconnect}
        className="px-3 py-1.5 text-sm glass-sm rounded border border-white/10 hover:bg-white/10 transition-colors duration-200 text-gray-300"
      >
        Disconnect
      </button>
    </div>
  );
}


