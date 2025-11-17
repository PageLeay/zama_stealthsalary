"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { loadFhevmInstance } from "@/fhevm/loader";
import { ABI, ADDRESSES } from "@/abi/StealthSalaryABI";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

export function useStealthSalary() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | undefined>();
  const [signer, setSigner] = useState<ethers.Signer | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [accountAddress, setAccountAddress] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const instanceRef = useRef<any>(null);

  // Wallet silent restore with EIP-6963 preference and persistence
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
        setProvider(p);
        const s = await p.getSigner();
        setSigner(s);
        const addr = await s.getAddress();
        setAccountAddress(addr);
        const net = await p.getNetwork();
        setChainId(Number(net.chainId));
        // persist
        localStorage.setItem("wallet.connected", "true");
        localStorage.setItem("wallet.lastAccounts", JSON.stringify(accounts));
        localStorage.setItem("wallet.lastChainId", String(Number(net.chainId)));
        if (selected.id) localStorage.setItem("wallet.lastConnectorId", selected.id);
      } else {
        // cleanup if no accounts
        localStorage.removeItem("wallet.connected");
        localStorage.removeItem("wallet.lastAccounts");
      }
    });

    selected.on?.("accountsChanged", (accs: string[]) => {
      if (!accs || accs.length === 0) {
        localStorage.removeItem("wallet.connected");
        localStorage.removeItem("wallet.lastAccounts");
      } else {
        localStorage.setItem("wallet.lastAccounts", JSON.stringify(accs));
      }
      // Clear per-account decryption signature cache
      const prev = accs?.[0];
      if (prev) localStorage.removeItem(`fhevm.decryptionSignature.${prev}`);
      window.location.reload();
    });
    selected.on?.("chainChanged", (cid: string | number) => {
      localStorage.setItem("wallet.lastChainId", String(cid));
      window.location.reload();
    });
    selected.on?.("connect", () => {
      localStorage.setItem("wallet.connected", "true");
    });
    selected.on?.("disconnect", () => {
      localStorage.removeItem("wallet.connected");
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (!provider || !signer || !chainId) return;
      try {
        instanceRef.current = await loadFhevmInstance(provider, signer, chainId);
        setReady(true);
      } catch (error: any) {
        console.error("Failed to load FHEVM instance:", error);
        setReady(false);
      }
    })();
  }, [provider, signer, chainId]);

  const contractAddress = useMemo(() => {
    // Try chainId match, fallback to first
    if (!chainId) return undefined as unknown as string;
    const byChain = (ADDRESSES as any)[String(chainId)] as string | undefined;
    return byChain || (Object.values(ADDRESSES)[0] as string);
  }, [chainId]);

  const formatEth = (wei: bigint) => `${Number(wei) / 1e18} ETH`;

  const submitEncrypted = async (position: string, region: string, years: number, salaryWei: bigint) => {
    if (!instanceRef.current || !signer || !contractAddress) throw new Error("not ready");
    const userAddress = await signer.getAddress();
    const input = instanceRef.current.createEncryptedInput(contractAddress, userAddress);
    input.add64(salaryWei);
    const enc = await input.encrypt();
    const contract = new ethers.Contract(contractAddress, ABI, signer);
    const tx = await contract.submit(
      ethers.toUtf8Bytes(position),
      ethers.toUtf8Bytes(region),
      years,
      enc.handles[0],
      enc.inputProof
    );
    const receipt = await tx.wait();
    return {
      hash: receipt.hash,
      contractAddress,
      encryptedHandle: enc.handles[0],
      accountAddress: userAddress,
    };
  };

  const authorizeAndRead = async (position: string, region: string, years: number) => {
    if (!signer || !contractAddress || !instanceRef.current || !provider) throw new Error("not ready");
    const contract = new ethers.Contract(contractAddress, ABI, signer);
    
    // First check if data exists by reading (will return ZeroHash if uninitialized)
    const [sumE, countE] = await contract.getSumAndCount(
      ethers.toUtf8Bytes(position),
      ethers.toUtf8Bytes(region),
      years
    );
    
    // Check if data is initialized (not ZeroHash)
    const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (sumE === ZERO_HASH || countE === ZERO_HASH) {
      throw new Error("No data found for this profile. Please submit salary data first.");
    }
    
    // Authorize for decryption
    await (await contract.authorizeForCaller(
      ethers.toUtf8Bytes(position),
      ethers.toUtf8Bytes(region),
      years
    )).wait();

    // Get or create decryption signature (same for both mock and relayer SDK)
    const storage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    };

    // Check if instance has generateKeypair method (mock-utils)
    const isMockInstance = typeof (instanceRef.current as any).generateKeypair === "function";
    
    let sig;
    if (isMockInstance) {
      // Mock instance: use generateKeypair and simplified signature
      const keyPair = (instanceRef.current as any).generateKeypair();
      const userAddress = await signer.getAddress();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 365;
      
      // Create EIP712 signature for mock mode
      const eip712 = instanceRef.current.createEIP712(
        keyPair.publicKey,
        [contractAddress],
        startTimestamp,
        durationDays
      );
      
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      sig = {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        signature,
        contractAddresses: [contractAddress as `0x${string}`],
        userAddress: userAddress as `0x${string}`,
        startTimestamp,
        durationDays,
      };
    } else {
      // Relayer SDK: use full signature flow
      sig = await FhevmDecryptionSignature.loadOrSign(
        instanceRef.current,
        [contractAddress],
        signer,
        storage
      );

      if (!sig) {
        throw new Error("Failed to create decryption signature");
      }
    }

    // Check if userDecrypt method exists
    if (typeof instanceRef.current.userDecrypt !== "function") {
      throw new Error("userDecrypt method not available on FHEVM instance.");
    }

    // Decrypt using userDecrypt method (works for both mock and relayer SDK)
    const decryptResult = await instanceRef.current.userDecrypt(
      [
        { handle: sumE, contractAddress: contractAddress as `0x${string}` },
        { handle: countE, contractAddress: contractAddress as `0x${string}` },
      ],
      sig.privateKey,
      sig.publicKey,
      sig.signature,
      sig.contractAddresses,
      sig.userAddress,
      sig.startTimestamp,
      sig.durationDays
    );

    const sumWei = BigInt(decryptResult[sumE] || 0);
    const countU32 = Number(decryptResult[countE] || 0);

    return { sumWei, countU32 };
  };

  return { ready, submitEncrypted, authorizeAndRead, formatEth, accountAddress };
}


