"use client";
import React, { useState, useEffect } from "react";
import { getSubmissions, deleteSubmission, type SalarySubmission } from "@/utils/storage";
import { useStealthSalary } from "@/hooks/useStealthSalary";

export function Profile() {
  const { ready, authorizeAndRead, formatEth, accountAddress } = useStealthSalary();
  const [submissions, setSubmissions] = useState<SalarySubmission[]>([]);
  const [decryptedSalaries, setDecryptedSalaries] = useState<Record<string, { average: string; count: number; mySalary?: string }>>({});
  const [decrypting, setDecrypting] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSubmissions();
  }, [accountAddress]);

  const loadSubmissions = () => {
    const subs = getSubmissions(accountAddress);
    setSubmissions(subs.sort((a, b) => b.timestamp - a.timestamp));
    
    // Debug: log for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.log('[Profile] Loading submissions:', {
        accountAddress,
        totalFound: subs.length,
        submissions: subs.map(s => ({
          id: s.id,
          position: s.position,
          hasAccountAddress: !!s.accountAddress,
          accountAddress: s.accountAddress,
        })),
      });
    }
  };

  const handleDecrypt = async (submission: SalarySubmission) => {
    if (!ready || decrypting[submission.id]) return;
    
    try {
      setDecrypting((prev) => ({ ...prev, [submission.id]: true }));
      setMsg((prev) => ({ ...prev, [submission.id]: "Decrypting..." }));

      const { sumWei, countU32 } = await authorizeAndRead(
        submission.position,
        submission.region,
        submission.years
      );

      const avgWei = countU32 > 0 ? sumWei / BigInt(countU32) : 0n;
      const mySalaryWei = BigInt(submission.salaryWei);

      setDecryptedSalaries((prev) => ({
        ...prev,
        [submission.id]: {
          average: formatEth(avgWei),
          count: countU32,
          mySalary: formatEth(mySalaryWei),
        },
      }));

      setMsg((prev) => ({ ...prev, [submission.id]: "✓ Decrypted successfully!" }));
    } catch (e: any) {
      setMsg((prev) => ({ ...prev, [submission.id]: `✗ ${e?.message || "Decryption failed"}` }));
    } finally {
      setDecrypting((prev => {
        const next = { ...prev };
        delete next[submission.id];
        return next;
      }));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this submission?")) {
      deleteSubmission(id, accountAddress);
      loadSubmissions();
      setDecryptedSalaries((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!accountAddress) {
    return (
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-white">My Profile</h3>
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">Please connect your wallet to view your submissions.</p>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-white">My Profile</h3>
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">You haven't submitted any salary data yet.</p>
          <p className="text-gray-500 text-sm mb-4">Current account: {accountAddress.slice(0, 10)}...{accountAddress.slice(-8)}</p>
          <a href="/submit" className="btn-primary inline-block">
            Submit Your First Salary
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6 text-white">My Profile</h3>
      <div className="space-y-4">
        {submissions.map((submission) => {
          const decrypted = decryptedSalaries[submission.id];
          const isDecrypting = decrypting[submission.id];
          const message = msg[submission.id];

          return (
            <div key={submission.id} className="glass rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    {submission.position}
                  </h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>📍 {submission.region}</div>
                    <div>💼 {submission.years} years experience</div>
                    <div>📅 {formatDate(submission.timestamp)}</div>
                    {submission.txHash && (
                      <div className="text-xs text-cyan-400 font-mono break-all">
                        TX: {submission.txHash.slice(0, 20)}...
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(submission.id)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
                >
                  Delete
                </button>
              </div>

              {decrypted ? (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Your Submitted Salary:</span>
                    <span className="text-xl font-semibold text-cyan-400">{decrypted.mySalary}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Average Salary (Your Profile Group):</span>
                    <span className="text-lg font-medium text-blue-400">{decrypted.average}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sample Count:</span>
                    <span className="text-lg font-medium text-teal-400">{decrypted.count}</span>
                  </div>
                  {decrypted.mySalary && parseFloat(decrypted.mySalary) > parseFloat(decrypted.average) ? (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-sm">
                      ✓ Your salary is above average for this profile group!
                    </div>
                  ) : decrypted.mySalary && parseFloat(decrypted.mySalary) < parseFloat(decrypted.average) ? (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                      ⚠ Your salary is below average for this profile group.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    className="btn-primary w-full"
                    disabled={!ready || isDecrypting}
                    onClick={() => handleDecrypt(submission)}
                  >
                    {isDecrypting ? "Decrypting..." : "Decrypt & Compare"}
                  </button>
                  {message && (
                    <div className={`text-sm mt-2 ${message.startsWith("✓") ? "text-green-400" : message.startsWith("✗") ? "text-red-400" : "text-gray-300"}`}>
                      {message}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

