"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { loadFhevmInstance } from "@/fhevm/loader";
import { ABI, ADDRESSES } from "@/abi/StealthSalaryABI";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

interface DistributionData {
  region: string;
  years: number;
  average: number;
  count: number;
}

export function useStealthSalaryDistribution() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | undefined>();
  const [signer, setSigner] = useState<ethers.Signer | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [ready, setReady] = useState(false);
  const instanceRef = useRef<any>(null);

  // Wallet silent restore
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
        const net = await p.getNetwork();
        setChainId(Number(net.chainId));
        localStorage.setItem("wallet.connected", "true");
        localStorage.setItem("wallet.lastAccounts", JSON.stringify(accounts));
        localStorage.setItem("wallet.lastChainId", String(Number(net.chainId)));
        if (selected.id) localStorage.setItem("wallet.lastConnectorId", selected.id);
      } else {
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
    if (!chainId) return undefined as unknown as string;
    const byChain = (ADDRESSES as any)[String(chainId)] as string | undefined;
    return byChain || (Object.values(ADDRESSES)[0] as string);
  }, [chainId]);

  const formatEth = (wei: bigint) => `${Number(wei) / 1e18} ETH`;


  const fetchDistributionByPosition = async (position: string): Promise<DistributionData[]> => {
    if (!signer || !contractAddress || !instanceRef.current || !provider) {
      throw new Error("not ready");
    }

    const contract = new ethers.Contract(contractAddress, ABI, signer);
    
    // Query all known region/years combinations for this position
    const REGIONS = ["New York", "San Francisco", "Seattle", "Boston", "Los Angeles", "Chicago", "Austin", "Remote", "Europe", "Asia", "Other"];
    const commonYears = [0, 1, 2, 3, 5, 10, 15, 20];
    
    // Step 1: Collect all profiles with data and batch authorize
    interface ProfileData {
      region: string;
      years: number;
      sumE: string;
      countE: string;
    }
    
    const profilesToProcess: ProfileData[] = [];
    
    // First pass: check which profiles have data
    for (const region of REGIONS) {
      for (const years of commonYears) {
        try {
          const [sumE, countE] = await contract.getSumAndCount(
            ethers.toUtf8Bytes(position),
            ethers.toUtf8Bytes(region),
            years
          );

          const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
          if (sumE !== ZERO_HASH && countE !== ZERO_HASH) {
            profilesToProcess.push({ region, years, sumE, countE });
          }
        } catch (e) {
          console.warn(`Failed to check ${position}/${region}/${years}:`, e);
        }
      }
    }

    if (profilesToProcess.length === 0) {
      return [];
    }

    // Step 2: Batch authorize all profiles (these are transactions, but can be sent in parallel)
    console.log(`[Distribution] Authorizing ${profilesToProcess.length} profiles...`);
    const authorizePromises = profilesToProcess.map((profile) =>
      contract.authorizeForCaller(
        ethers.toUtf8Bytes(position),
        ethers.toUtf8Bytes(profile.region),
        profile.years
      ).then((tx: any) => tx.wait())
    );
    
    // Wait for all authorizations (in parallel)
    await Promise.all(authorizePromises);
    console.log(`[Distribution] All profiles authorized`);

    // Step 3: Create decryption signature ONCE (this is the only signature needed)
    const storage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    };

    const isMockInstance = typeof (instanceRef.current as any).generateKeypair === "function";
    
    let sig;
    if (isMockInstance) {
      const keyPair = (instanceRef.current as any).generateKeypair();
      const userAddress = await signer.getAddress();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const durationDays = 365;
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

    // Step 4: Batch decrypt all handles at once (single decrypt call)
    console.log(`[Distribution] Decrypting ${profilesToProcess.length * 2} handles...`);
    const allHandles = profilesToProcess.flatMap((profile) => [
      { handle: profile.sumE, contractAddress: contractAddress as `0x${string}` },
      { handle: profile.countE, contractAddress: contractAddress as `0x${string}` },
    ]);

    const decryptResult = await instanceRef.current.userDecrypt(
      allHandles,
      sig.privateKey,
      sig.publicKey,
      sig.signature,
      sig.contractAddresses,
      sig.userAddress,
      sig.startTimestamp,
      sig.durationDays
    );

    // Step 5: Process results
    const results: DistributionData[] = [];
    for (const profile of profilesToProcess) {
      try {
        const sumWei = BigInt(decryptResult[profile.sumE] || 0);
        const countU32 = Number(decryptResult[profile.countE] || 0);
        
        if (countU32 > 0) {
          const avgWei = sumWei / BigInt(countU32);
          results.push({
            region: profile.region,
            years: profile.years,
            average: Number(avgWei) / 1e18,
            count: countU32,
          });
        }
      } catch (e) {
        console.warn(`Failed to process ${position}/${profile.region}/${profile.years}:`, e);
      }
    }

    console.log(`[Distribution] Successfully decrypted ${results.length} profiles`);
    return results;
  };

  return { ready, fetchDistributionByPosition, formatEth };
}

