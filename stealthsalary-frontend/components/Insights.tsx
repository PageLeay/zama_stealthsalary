"use client";
import React, { useState, useEffect } from "react";
import { useStealthSalary } from "@/hooks/useStealthSalary";
import { useStealthSalaryDistribution } from "@/hooks/useStealthSalaryDistribution";
import { POSITIONS, REGIONS } from "@/constants/options";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export function Insights() {
  const { ready, authorizeAndRead, formatEth } = useStealthSalary();
  const { ready: distReady, fetchDistributionByPosition } = useStealthSalaryDistribution();
  const [position, setPosition] = useState("");
  const [region, setRegion] = useState("");
  const [years, setYears] = useState(0);
  const [sum, setSum] = useState<string>("-");
  const [count, setCount] = useState<string>("-");
  const [avg, setAvg] = useState<string>("-");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Distribution data
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [loadingDistribution, setLoadingDistribution] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);

  const onDecrypt = async () => {
    if (!ready || loading) return;
    try {
      setLoading(true);
      setMsg("Authorizing & decrypting...");
      const { sumWei, countU32 } = await authorizeAndRead(position, region, years);
      setSum(formatEth(sumWei));
      setCount(String(countU32));
      const avgWei = countU32 > 0 ? sumWei / BigInt(countU32) : 0n;
      setAvg(formatEth(avgWei));
      setMsg("✓ Decryption successful!");
      setShowDistribution(false);
    } catch (e: any) {
      setMsg(`✗ Decryption failed: ${e?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const onLoadDistribution = async () => {
    if (!position || !distReady || loadingDistribution) return;
    try {
      setLoadingDistribution(true);
      setMsg("Loading distribution data...");
      const data = await fetchDistributionByPosition(position);
      
      // Group by region
      const byRegion: Record<string, { sum: number; count: number }> = {};
      const byYears: Record<number, { sum: number; count: number }> = {};
      
      data.forEach((item) => {
        if (!byRegion[item.region]) {
          byRegion[item.region] = { sum: 0, count: 0 };
        }
        byRegion[item.region].sum += item.average * item.count;
        byRegion[item.region].count += item.count;
        
        if (!byYears[item.years]) {
          byYears[item.years] = { sum: 0, count: 0 };
        }
        byYears[item.years].sum += item.average * item.count;
        byYears[item.years].count += item.count;
      });

      // Prepare chart data
      const regionChartData = Object.entries(byRegion)
        .map(([region, stats]) => ({
          region,
          average: stats.count > 0 ? stats.sum / stats.count : 0,
          count: stats.count,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.average - a.average);

      const yearsChartData = Object.entries(byYears)
        .map(([years, stats]) => ({
          years: Number(years),
          average: stats.count > 0 ? stats.sum / stats.count : 0,
          count: stats.count,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => a.years - b.years);

      setDistributionData([
        { type: "region", data: regionChartData },
        { type: "years", data: yearsChartData },
      ]);
      
      setShowDistribution(true);
      setMsg("✓ Distribution loaded successfully!");
    } catch (e: any) {
      setMsg(`✗ Failed to load distribution: ${e?.message || "Unknown error"}`);
    } finally {
      setLoadingDistribution(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 text-white">Insights</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
          <select
            className="input-glass"
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setShowDistribution(false);
              setDistributionData([]);
            }}
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
            <option value="">All Regions</option>
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
        <div className="flex gap-2">
          <button
            className="btn-primary flex-1"
            disabled={!ready || loading || !position || !region || years === undefined}
            onClick={onDecrypt}
          >
            {loading ? "Decrypting..." : "Decrypt Specific"}
          </button>
          <button
            className="btn-primary flex-1 bg-gradient-to-r from-cyan-500 to-teal-500"
            disabled={!distReady || loadingDistribution || !position}
            onClick={onLoadDistribution}
          >
            {loadingDistribution ? "Loading..." : "Load Distribution"}
          </button>
        </div>
        {msg && (
          <div className={`text-sm ${msg.startsWith("✓") ? "text-green-400" : msg.startsWith("✗") ? "text-red-400" : "text-gray-300"}`}>
            {msg}
          </div>
        )}
        
        {/* Specific Profile Results */}
        {!showDistribution && avg !== "-" && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Average Salary:</span>
              <span className="text-xl font-semibold text-cyan-400">{avg}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Sum:</span>
              <span className="text-lg font-medium text-blue-400">{sum}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Sample Count:</span>
              <span className="text-lg font-medium text-teal-400">{count}</span>
            </div>
          </div>
        )}

        {/* Distribution Charts */}
        {showDistribution && distributionData.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
            <h4 className="text-xl font-semibold text-white">Distribution Analysis for {position}</h4>
            
            {/* By Region */}
            {distributionData.find((d) => d.type === "region")?.data.length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-gray-300 mb-3">Average Salary by Region</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={distributionData.find((d) => d.type === "region")?.data || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="region" 
                      stroke="#9ca3af"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      label={{ value: "ETH", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => `${value.toFixed(4)} ETH`}
                    />
                    <Legend />
                    <Bar dataKey="average" fill="#06b6d4" name="Average Salary (ETH)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Experience */}
            {distributionData.find((d) => d.type === "years")?.data.length > 0 && (
              <div>
                <h5 className="text-lg font-medium text-gray-300 mb-3">Average Salary by Experience (Years)</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={distributionData.find((d) => d.type === "years")?.data || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="years" 
                      stroke="#9ca3af"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      label={{ value: "Years of Experience", position: "insideBottom", offset: -5, fill: "#9ca3af" }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      label={{ value: "ETH", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => `${value.toFixed(4)} ETH`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4" }} name="Average Salary (ETH)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
