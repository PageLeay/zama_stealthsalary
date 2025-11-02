# StealthSalary - Private Salary Comparison Platform

A fully homomorphic encryption (FHE) based decentralized application (dApp) that enables anonymous salary data submission and aggregation without revealing individual salary information.

## Overview

StealthSalary is a privacy-preserving salary comparison platform built on FHEVM (Fully Homomorphic Encryption Virtual Machine). Users can anonymously submit their salary data, and the system performs encrypted aggregation to calculate average salaries, distributions, and ranges without exposing any personal information.

## Features

- **Encrypted Salary Submission**: Users submit salary data encrypted using FHEVM
- **Private Aggregation**: All calculations (sum, count, histogram) are performed in ciphertext
- **Anonymous Insights**: View aggregated statistics without revealing individual data
- **Personal Profile**: Decrypt and view your own submitted salary data
- **Distribution Charts**: Visualize salary distributions by position, region, and experience

## Technology Stack

- **Smart Contracts**: Solidity with FHEVM v0.9
- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with Glassmorphism design
- **Charts**: Recharts for data visualization
- **Wallet Integration**: EIP-1193 compatible wallets
- **Deployment**: Vercel (frontend), Sepolia Testnet (contracts)

## Project Structure

```
zama_stealthsalary/
├── fhevm-hardhat-template/    # Smart contract development
│   ├── contracts/              # Solidity contracts
│   ├── deploy/                 # Deployment scripts
│   ├── test/                   # Contract tests
│   └── hardhat.config.ts       # Hardhat configuration
├── stealthsalary-frontend/     # Next.js frontend application
│   ├── app/                    # Next.js app router pages
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── fhevm/                  # FHEVM integration
│   └── abi/                    # Contract ABIs
└── README.md                   # This file
```

## Smart Contract

The `StealthSalary` contract (`fhevm-hardhat-template/contracts/StealthSalary.sol`) provides:

- `submit()`: Submit encrypted salary data with position, region, and years of experience
- `getSumAndCount()`: Get encrypted sum and count for a profile
- `getHistogram()`: Get encrypted salary distribution histogram
- `authorizeForCaller()`: Authorize decryption for aggregated data

**Deployed Address (Sepolia Testnet)**: `0x15e098bcDf9CBd1815BE8c4dA8181dC140117983`

## Frontend Application

The frontend is a Next.js application with the following pages:

- **Home** (`/`): Welcome page with navigation
- **Submit** (`/submit`): Submit encrypted salary data
- **Insights** (`/insights`): View aggregated statistics and charts
- **My Profile** (`/profile`): View and decrypt personal submissions

**Live Demo**: https://stealthsalary-frontend.vercel.app

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- MetaMask or compatible wallet
- Sepolia testnet ETH (for gas fees)

### Smart Contract Setup

1. Navigate to the contract directory:
   ```bash
   cd fhevm-hardhat-template
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   ```

4. Compile contracts:
   ```bash
   npx hardhat compile
   ```

5. Run tests:
   ```bash
   npx hardhat test
   ```

6. Deploy to Sepolia:
   ```bash
   npx hardhat deploy --network sepolia
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd stealthsalary-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate ABI files:
   ```bash
   node scripts/genabi.mjs
   ```

4. Run development server (with mock):
   ```bash
   npm run dev:mock
   ```

   Or with real Relayer SDK:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## FHEVM Integration

The application supports two modes:

1. **Mock Mode** (`dev:mock`): Uses `@fhevm/mock-utils` for local development with Hardhat node
2. **Production Mode** (`dev`): Uses `@zama-fhe/relayer-sdk` with Zama's Relayer service for Sepolia testnet

## Security & Privacy

- All salary data is encrypted using FHEVM before submission
- Aggregation calculations are performed entirely in ciphertext
- Individual data cannot be decrypted by anyone except the data owner
- Decryption requires explicit authorization via EIP-712 signatures

## License

MIT

## Acknowledgments

Built with [FHEVM](https://github.com/zama-ai/fhevm) by [Zama](https://www.zama.ai/)

