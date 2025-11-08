// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title StealthSalary - Private salary aggregation using FHEVM
/// @notice Aggregates encrypted salaries by profile (position|region|years) and exposes transiently-authorized views
contract StealthSalary is ZamaEthereumConfig {
    struct Aggregate {
        euint64 sum; // aggregated salary sum
        euint32 count; // number of samples
        euint32[32] histogram; // distribution buckets
    }

    // ---- Parameters ----
    uint64 public constant BUCKET_SIZE_WEI = 1e16; // 0.01 ETH granularity per bucket
    uint8 public constant NUM_BUCKETS = 32; // number of histogram buckets

    mapping(bytes32 => Aggregate) private aggregates; // key: keccak256(position|region|years)
    
    // Store all region/years combinations for a position (for distribution queries)
    mapping(bytes32 => bytes32[]) private positionProfiles; // key: keccak256(position), value: array of profileKeys

    /// @notice Submit one encrypted salary for a profile
    /// @param position UTF-8 bytes
    /// @param region UTF-8 bytes
    /// @param yearsFrom0 0..60
    /// @param inputE the encrypted salary handle
    /// @param inputProof the input proof
    function submit(
        bytes calldata position,
        bytes calldata region,
        uint8 yearsFrom0,
        externalEuint64 inputE,
        bytes calldata inputProof
    ) external {
        bytes32 profileKey = keccak256(abi.encodePacked(position, "|", region, "|", yearsFrom0));

        Aggregate storage agg = aggregates[profileKey];

        euint64 salary = FHE.fromExternal(inputE, inputProof);

        // sum += salary
        agg.sum = FHE.add(agg.sum, salary);

        // count += 1
        euint32 one = FHE.asEuint32(1);
        agg.count = FHE.add(agg.count, one);

        // histogram bucket update
        // bucketIndex = min(NUM_BUCKETS-1, salary / BUCKET_SIZE_WEI)
        euint64 q = FHE.div(salary, BUCKET_SIZE_WEI);

        // clamp to [0, NUM_BUCKETS-1] using encrypted selects
        // Build encrypted index as euint32 via comparisons to constants
        for (uint8 i = 0; i < NUM_BUCKETS; i++) {
            // cond = (q == i)
            euint32 inc = FHE.asEuint32(0);
            // Compare q with i (cast i -> euint64) and select 1 or 0
            // Note: equality returns ebool
            if (i == 0) {
                inc = FHE.select(FHE.eq(q, FHE.asEuint64(0)), one, FHE.asEuint32(0));
            } else {
                inc = FHE.select(FHE.eq(q, FHE.asEuint64(i)), one, FHE.asEuint32(0));
            }

            // Accumulate into histogram[i]
            agg.histogram[i] = FHE.add(agg.histogram[i], inc);
        }

        // Persist allowances for contract to operate on updated ciphertexts in future txs
        FHE.allowThis(agg.sum);
        FHE.allowThis(agg.count);
        for (uint8 i = 0; i < NUM_BUCKETS; i++) {
            FHE.allowThis(agg.histogram[i]);
        }
        
        // Track profile keys for this position (for distribution queries)
        bytes32 positionKey = keccak256(position);
        bytes32[] storage profiles = positionProfiles[positionKey];
        bool exists = false;
        for (uint256 i = 0; i < profiles.length; i++) {
            if (profiles[i] == profileKey) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            positionProfiles[positionKey].push(profileKey);
        }
    }

    /// @notice Returns encrypted sum and count for the profile (no ACL changes)
    function getSumAndCount(
        bytes calldata position,
        bytes calldata region,
        uint8 yearsFrom0
    ) external view returns (euint64, euint32) {
        bytes32 profileKey = keccak256(abi.encodePacked(position, "|", region, "|", yearsFrom0));
        Aggregate storage agg = aggregates[profileKey];
        return (agg.sum, agg.count);
    }

    /// @notice Returns encrypted histogram (no ACL changes)
    function getHistogram(
        bytes calldata position,
        bytes calldata region,
        uint8 yearsFrom0
    ) external view returns (euint32[32] memory) {
        bytes32 profileKey = keccak256(abi.encodePacked(position, "|", region, "|", yearsFrom0));
        Aggregate storage agg = aggregates[profileKey];
        return agg.histogram;
    }

    /// @notice Grants caller decryption access for sum, count and histogram
    /// @dev If aggregate does not exist (uninitialized), this function succeeds without error
    function authorizeForCaller(
        bytes calldata position,
        bytes calldata region,
        uint8 yearsFrom0
    ) external {
        bytes32 profileKey = keccak256(abi.encodePacked(position, "|", region, "|", yearsFrom0));
        Aggregate storage agg = aggregates[profileKey];
        
        // Check if aggregate is initialized by checking if sum is initialized
        if (FHE.isInitialized(agg.sum)) {
            FHE.allow(agg.sum, msg.sender);
        }
        if (FHE.isInitialized(agg.count)) {
            FHE.allow(agg.count, msg.sender);
        }
        for (uint8 i = 0; i < NUM_BUCKETS; i++) {
            if (FHE.isInitialized(agg.histogram[i])) {
                FHE.allow(agg.histogram[i], msg.sender);
            }
        }
    }
    
    /// @notice Get all profile keys for a given position (for distribution analysis)
    /// @return profileKeys Array of profile keys (bytes32) for this position
    function getPositionProfileKeys(bytes calldata position) external view returns (bytes32[] memory) {
        bytes32 positionKey = keccak256(position);
        return positionProfiles[positionKey];
    }
}


