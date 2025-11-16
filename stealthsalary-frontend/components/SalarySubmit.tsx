"use client";
import React, { useState } from "react";
import { useStealthSalary } from "@/hooks/useStealthSalary";
import { POSITIONS, REGIONS } from "@/constants/options";
import { saveSubmission } from "@/utils/storage";

export function SalarySubmit() {
  const { ready, submitEncrypted, accountAddress } = useStealthSalary();
  const [position, setPosition] = useState("");
  const [region, setRegion] = useState("");
  const [years, setYears] = useState(0);
  const [salaryEth, setSalaryEth] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!ready || loading) return;
    try {
      setLoading(true);
      setMsg("Encrypt & submit...");
      const eth = BigInt(Math.floor(parseFloat(salaryEth || "0") * 1e9)) * 10n ** 9n; // 1e18
      const txResult = await submitEncrypted(position, region, years, eth);
      
      // Get current account address from txResult or hook
      const finalAccountAddress = txResult?.accountAddress || accountAddress || "";
      
      if (!finalAccountAddress) {
        throw new Error("Failed to get account address. Please ensure wallet is connected.");
      }
      
      // Save submission to local storage
      const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      saveSubmission({
        id: submissionId,
        position,
        region,
        years,
        salaryEth,
        salaryWei: eth.toString(),
        timestamp: Date.now(),
        txHash: txResult?.hash,
        contractAddress: txResult?.contractAddress,
        accountAddress: finalAccountAddress,
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[SalarySubmit] Saved submission:', {
          id: submissionId,
          accountAddress: finalAccountAddress,
          position,
          region,
          years,
        });
      }
      
      setMsg("✓ Submitted successfully!");
      setPosition("");
      setRegion("");
      setYears(0);
      setSalaryEth("");
    } catch (e: any) {
      setMsg(`✗ Submit failed: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 text-white">Submit Your Salary</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
          <select
            className="input-glass"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="">Select Position</option>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Region</label>
          <select
            className="input-glass"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Select Region</option>
            {REGIONS.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Experience (years)</label>
          <input
            type="number"
            className="input-glass"
            placeholder="0"
            min="0"
            max="60"
            value={years || ""}
            onChange={(e) => setYears(parseInt(e.target.value || "0"))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Salary (ETH)</label>
          <input
            type="number"
            step="0.01"
            className="input-glass"
            placeholder="e.g., 2.5"
            value={salaryEth}
            onChange={(e) => setSalaryEth(e.target.value)}
          />
        </div>
        <button
          className="btn-primary w-full"
          disabled={!ready || loading}
          onClick={onSubmit}
        >
          {loading ? "Encrypting & Submitting..." : "Encrypt & Submit"}
        </button>
        {msg && (
          <div className={`text-sm ${msg.startsWith("✓") ? "text-green-400" : msg.startsWith("✗") ? "text-red-400" : "text-gray-300"}`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}



