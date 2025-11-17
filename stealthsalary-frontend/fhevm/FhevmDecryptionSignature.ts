import { ethers } from "ethers";
import type { FhevmInstance } from "./fhevmTypes";

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;

  constructor(
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    if (!ethers.isAddress(userAddress)) {
      throw new TypeError(`Invalid address ${userAddress}`);
    }

    const sortedContractAddresses = (
      contractAddresses as `0x${string}`[]
    ).sort();

    const emptyEIP712 = instance.createEIP712(
      publicKey ?? ethers.ZeroAddress,
      sortedContractAddresses,
      0,
      0
    );

    try {
      const hash = ethers.TypedDataEncoder.hash(
        emptyEIP712.domain,
        { UserDecryptRequestVerification: emptyEIP712.types.UserDecryptRequestVerification },
        emptyEIP712.message
      );

      this.#contractAddresses = sortedContractAddresses;
      this.#userAddress = userAddress as `0x${string}`;

      this.#key = `${userAddress}:${hash}`;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number;
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];

  private constructor(parameters: {
    publicKey: string;
    privateKey: string;
    signature: string;
    startTimestamp: number;
    durationDays: number;
    userAddress: `0x${string}`;
    contractAddresses: `0x${string}`[];
  }) {
    this.#publicKey = parameters.publicKey;
    this.#privateKey = parameters.privateKey;
    this.#signature = parameters.signature;
    this.#startTimestamp = parameters.startTimestamp;
    this.#durationDays = parameters.durationDays;
    this.#userAddress = parameters.userAddress;
    this.#contractAddresses = parameters.contractAddresses;
  }

  get privateKey() {
    return this.#privateKey;
  }

  get publicKey() {
    return this.#publicKey;
  }

  get signature() {
    return this.#signature;
  }

  get contractAddresses() {
    return this.#contractAddresses;
  }

  get userAddress() {
    return this.#userAddress;
  }

  get startTimestamp() {
    return this.#startTimestamp;
  }

  get durationDays() {
    return this.#durationDays;
  }

  static async loadFromStorage(
    storage: Storage,
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ): Promise<FhevmDecryptionSignature | null> {
    const keyObj = new FhevmDecryptionSignatureStorageKey(
      instance,
      contractAddresses,
      userAddress,
      publicKey
    );
    const storageKey = `fhevm.decryptionSignature.${keyObj.key}`;
    const stored = storage.getItem(storageKey);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return new FhevmDecryptionSignature(parsed);
    } catch {
      return null;
    }
  }

  static async new(
    instance: FhevmInstance,
    contractAddresses: string[],
    publicKey: string,
    privateKey: string,
    signer: ethers.Signer
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const userAddress = (await signer.getAddress()) as `0x${string}`;
      const startTimestamp = _timestampNow();
      const durationDays = 365;
      const eip712 = instance.createEIP712(
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );
      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        contractAddresses: contractAddresses as `0x${string}`[],
        startTimestamp,
        durationDays,
        signature,
        userAddress,
      });
    } catch {
      return null;
    }
  }

  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: ethers.Signer,
    storage: Storage
  ): Promise<FhevmDecryptionSignature | null> {
    const userAddress = (await signer.getAddress()) as `0x${string}`;
    
    const publicKey = instance.getPublicKey();
    const privateKey = instance.getPrivateKey();

    if (!publicKey || !privateKey) {
      return null;
    }

    let sig = await FhevmDecryptionSignature.loadFromStorage(
      storage,
      instance,
      contractAddresses,
      userAddress,
      publicKey
    );

    if (!sig) {
      sig = await FhevmDecryptionSignature.new(
        instance,
        contractAddresses,
        publicKey,
        privateKey,
        signer
      );
      if (sig) {
        const keyObj = new FhevmDecryptionSignatureStorageKey(
          instance,
          contractAddresses,
          userAddress,
          publicKey
        );
        const storageKey = `fhevm.decryptionSignature.${keyObj.key}`;
        storage.setItem(
          storageKey,
          JSON.stringify({
            publicKey: sig.publicKey,
            privateKey: sig.privateKey,
            signature: sig.signature,
            startTimestamp: sig.startTimestamp,
            durationDays: sig.durationDays,
            userAddress: sig.userAddress,
            contractAddresses: sig.contractAddresses,
          })
        );
      }
    }

    return sig;
  }
}

