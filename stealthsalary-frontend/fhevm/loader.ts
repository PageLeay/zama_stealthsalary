const SDK_CDN_URL = "https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs";
const SDK_LOCAL_URL = "/relayer-sdk-js.umd.cjs"; // Local backup with WASM files

async function loadRelayerSDKFromCDN(): Promise<void> {
  return new Promise((resolve, reject) => {
    const anyWindow: any = window as any;
    
    // Check if already loaded
    if (anyWindow.relayerSDK?.createInstance) {
      resolve();
      return;
    }

    // Try local first (so WASM files from same directory work), then CDN
    const urls = [SDK_LOCAL_URL, SDK_CDN_URL];
    let currentUrlIndex = 0;

    const tryLoadUrl = (url: string) => {
      // Check if script already exists
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        // Wait a bit for it to load
        const checkInterval = setInterval(() => {
          if (anyWindow.relayerSDK?.createInstance) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!anyWindow.relayerSDK?.createInstance) {
            reject(new Error("Relayer SDK script loaded but window.relayerSDK not available"));
          }
        }, 5000);
        return;
      }

      // Create and load script
      const script = document.createElement("script");
      script.src = url;
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        if (anyWindow.relayerSDK?.createInstance) {
          console.log(`[RelayerSDK] Loaded from ${url === SDK_LOCAL_URL ? 'local' : 'CDN'}`);
          resolve();
        } else {
          reject(new Error("Relayer SDK script loaded but window.relayerSDK.createInstance not available"));
        }
      };
      script.onerror = () => {
        console.warn(`Failed to load Relayer SDK from ${url}`);
        // Try next URL
        currentUrlIndex++;
        if (currentUrlIndex < urls.length) {
          tryLoadUrl(urls[currentUrlIndex]);
        } else {
          reject(new Error(`Failed to load Relayer SDK from all sources`));
        }
      };
      document.head.appendChild(script);
    };

    tryLoadUrl(urls[currentUrlIndex]);
  });
}

async function tryGetMockMetadata(rpcUrl: string): Promise<any> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "fhevm_relayer_metadata",
        params: [],
        id: 1,
      }),
    });
    const data = await response.json();
    if (data.result && typeof data.result === "object") {
      return data.result;
    }
  } catch {}
  return null;
}

export async function loadFhevmInstance(provider: any, signer: any, chainId: number) {
  const anyWindow: any = window as any;
  
  // Mock chains (local development) - ONLY use mock-utils for these chains
  const mockChains = [31337];
  const isMockChain = mockChains.includes(chainId);
  
  // Try to get RPC URL from provider
  let rpcUrl: string | undefined;
  if (provider?.connection?.url) {
    rpcUrl = provider.connection.url;
  } else if (chainId === 31337) {
    rpcUrl = "http://localhost:8545";
  }

  // For mock chains (31337), ONLY use mock-utils, never try CDN SDK
  if (isMockChain) {
    // Try to get metadata first (required for proper mock instance creation)
    let metadata = null;
    if (rpcUrl) {
      try {
        metadata = await tryGetMockMetadata(rpcUrl);
        if (!metadata?.ACLAddress || !metadata?.InputVerifierAddress || !metadata?.KMSVerifierAddress) {
          metadata = null;
        }
      } catch (e) {
        console.warn("Could not fetch FHEVM metadata from RPC:", e);
      }
    }

    // If no metadata, provide helpful error
    if (!metadata) {
      throw new Error(
        `Could not fetch FHEVM metadata from Hardhat node at ${rpcUrl || "http://localhost:8545"}. ` +
        "Ensure: 1) Hardhat node is running with FHEVM plugin, 2) Node is accessible, 3) Deployments are complete."
      );
    }

    // Always use mock-utils for chainId 31337
    try {
      const { MockFhevmInstance } = await import("@fhevm/mock-utils");
      const { JsonRpcProvider, Contract } = await import("ethers");
      
      // Create a provider from the RPC URL
      const rpcProvider = rpcUrl ? new JsonRpcProvider(rpcUrl) : provider;
      
      // Query InputVerifier contract's EIP712 domain for proper verifyingContract address
      const inputVerifierContract = new Contract(
        metadata.InputVerifierAddress,
        ["function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"],
        rpcProvider
      );
      const domain = await inputVerifierContract.eip712Domain();
      const verifyingContractAddressInputVerification = domain[4]; // index 4 is verifyingContract
      const gatewayChainId = Number(domain[3]); // index 3 is chainId
      
      // Create mock instance with metadata (v0.3.0 requires 4th parameter: properties)
      const instance = await MockFhevmInstance.create(
        rpcProvider,
        rpcProvider,
        {
          aclContractAddress: metadata.ACLAddress,
          chainId: chainId,
          gatewayChainId: gatewayChainId,
          inputVerifierContractAddress: metadata.InputVerifierAddress,
          kmsContractAddress: metadata.KMSVerifierAddress,
          verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
          verifyingContractAddressInputVerification: verifyingContractAddressInputVerification,
        },
        {
          // v0.3.0 requires this 4th parameter
          inputVerifierProperties: {},
          kmsVerifierProperties: {},
        }
      );
      
      return instance;
    } catch (e) {
      throw new Error(
        `Failed to create mock FHEVM instance for chainId ${chainId}. ` +
        `Ensure Hardhat node is running with FHEVM plugin at ${rpcUrl || "http://localhost:8545"}. ` +
        `Error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  // For non-mock chains (testnet/mainnet), use Relayer SDK
  
  // 1. If chainId is unknown (0) or provider not connected, provide helpful error first
  if (!chainId || chainId === 0) {
    throw new Error(
      "Wallet not connected. Please connect your wallet first."
    );
  }

  // 2. Get raw EIP-1193 provider from window.ethereum
  // The SDK expects the raw provider (window.ethereum), not the ethers wrapper
  // If multiple providers exist (EIP-6963), we need to find the right one
  let rawProvider: any;
  const ethereum = anyWindow.ethereum;
  
  if (ethereum) {
    // Check if this is an EIP-6963 multi-provider scenario
    const providers = ethereum.providers || [ethereum];
    
    // Try to match by chainId if possible
    if (Array.isArray(providers) && providers.length > 1) {
      // Use the last connected one from localStorage
      const lastConnectorId = localStorage.getItem("wallet.lastConnectorId");
      if (lastConnectorId) {
        rawProvider = providers.find((p: any) => p?.id === lastConnectorId) || providers[0];
      } else {
        rawProvider = providers[0];
      }
    } else {
      rawProvider = ethereum;
    }
  }
  
  if (!rawProvider) {
    throw new Error("No Ethereum provider found. Please install MetaMask or another wallet.");
  }

  // 3. Check if global relayer SDK is already available
  if (anyWindow.relayerSDK?.createInstance && anyWindow.relayerSDK?.SepoliaConfig) {
    // v0.3.0 requires initSDK() to initialize WASM modules before createInstance
    if (anyWindow.relayerSDK.initSDK && !anyWindow.__relayerSDKInitialized__) {
      try {
        await anyWindow.relayerSDK.initSDK();
        anyWindow.__relayerSDKInitialized__ = true;
      } catch (e) {
        console.error("Failed to initialize Relayer SDK (WASM init):", e);
        throw new Error(`Failed to initialize FHEVM WASM modules: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // v0.3.0 API: createInstance now takes a config object
    const config = {
      ...anyWindow.relayerSDK.SepoliaConfig,
      network: rawProvider, // Use raw EIP-1193 provider
      // Let SepoliaConfig use its default relayerUrl
    };
    console.log('[loadFhevmInstance] Creating instance with config:', {
      ...config,
      network: '(provider object)', // Don't log the actual provider
    });
    return await anyWindow.relayerSDK.createInstance(config);
  }

  // 4. Try to load relayer SDK from CDN
  try {
    await loadRelayerSDKFromCDN();
    if (anyWindow.relayerSDK?.createInstance && anyWindow.relayerSDK?.SepoliaConfig) {
      // v0.3.0 requires initSDK() to initialize WASM modules before createInstance
      if (anyWindow.relayerSDK.initSDK && !anyWindow.__relayerSDKInitialized__) {
        try {
          await anyWindow.relayerSDK.initSDK();
          anyWindow.__relayerSDKInitialized__ = true;
        } catch (e) {
          console.error("Failed to initialize Relayer SDK (WASM init):", e);
          throw new Error(`Failed to initialize FHEVM WASM modules: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      
      // v0.3.0 API: createInstance now takes a config object
      const config = {
        ...anyWindow.relayerSDK.SepoliaConfig,
        network: rawProvider, // Use raw EIP-1193 provider
        // Let SepoliaConfig use its default relayerUrl
      };
      console.log('[loadFhevmInstance] Creating instance with config:', {
        ...config,
        network: '(provider object)', // Don't log the actual provider
      });
      return await anyWindow.relayerSDK.createInstance(config);
    }
  } catch (e) {
    console.error("Failed to load relayer SDK from CDN:", e);
  }

  throw new Error(
    `Failed to load FHEVM instance for chainId ${chainId}. ` +
    "For testnet/mainnet, ensure Relayer SDK CDN is accessible and browser supports required headers (COOP/COEP)."
  );
}


