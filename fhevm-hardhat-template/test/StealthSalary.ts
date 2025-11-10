import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { StealthSalary, StealthSalary__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("StealthSalary")) as StealthSalary__factory;
  const contract = (await factory.deploy()) as StealthSalary;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("StealthSalary", function () {
  let signers: Signers;
  let contract: StealthSalary;
  let address: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
  });

  it("initial sum and count are uninitialized (ZeroHash)", async function () {
    const [sumE, countE] = await contract.getSumAndCount(
      ethers.toUtf8Bytes("Engineer"),
      ethers.toUtf8Bytes("NY"),
      3
    );
    expect(sumE).to.eq(ethers.ZeroHash);
    expect(countE).to.eq(ethers.ZeroHash);
  });

  it("submit one salary and decrypt sum/count", async function () {
    const position = ethers.toUtf8Bytes("Engineer");
    const region = ethers.toUtf8Bytes("NY");
    const years = 3;

    const salaryEth = 2n; // 2 ETH
    const salaryWei = salaryEth * 10n ** 18n;

    const enc = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add64(salaryWei)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .submit(position, region, years, enc.handles[0], enc.inputProof);
    await tx.wait();

    await contract.connect(signers.alice).authorizeForCaller(position, region, years);
    const [sumE, countE] = await contract.getSumAndCount(position, region, years);

    const sum = await fhevm.userDecryptEuint(FhevmType.euint64, sumE, address, signers.alice);
    const count = await fhevm.userDecryptEuint(FhevmType.euint32, countE, address, signers.alice);

    expect(sum).to.eq(salaryWei);
    expect(count).to.eq(1);
  });
});


