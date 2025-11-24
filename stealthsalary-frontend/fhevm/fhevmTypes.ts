// FHEVM instance interface (compatible with both relayer SDK and mock-utils)
export interface FhevmInstance {
  getPublicKey(): string;
  getPrivateKey(): string;
  createEncryptedInput(contractAddress: string, userAddress: string): {
    add32(value: number): any;
    add64(value: bigint): any;
    encrypt(): Promise<{ handles: string[]; inputProof: string }>;
  };
  userDecrypt(
    handles: Array<{ handle: string; contractAddress: `0x${string}` }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: `0x${string}`,
    startTimestamp: number,
    durationDays: number
  ): Promise<Record<string, bigint | number>>;
  createEIP712(
    publicKey: string,
    contractAddresses: string[],
    startTimestamp: number,
    durationDays: number
  ): {
    domain: {
      chainId: number;
      name: string;
      verifyingContract: `0x${string}`;
      version: string;
    };
    message: any;
    primaryType: string;
    types: {
      [key: string]: {
        name: string;
        type: string;
      }[];
    };
  };
}


