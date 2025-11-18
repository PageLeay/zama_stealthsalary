export interface SalarySubmission {
  id: string;
  position: string;
  region: string;
  years: number;
  salaryEth: string;
  salaryWei: string;
  timestamp: number;
  txHash?: string;
  // Encrypted handle for decryption later
  encryptedHandle?: string;
  contractAddress?: string;
  // Account address that submitted this
  accountAddress: string;
}

const STORAGE_KEY = "stealthsalary.submissions";

export function saveSubmission(submission: SalarySubmission): void {
  const existing = getSubmissions();
  existing.push(submission);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getSubmissions(accountAddress?: string): SalarySubmission[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const all = JSON.parse(stored) as any[];
    // Migrate old records: if accountAddress is missing, try to infer from wallet state
    // But for now, if filtering by accountAddress, only return records with matching accountAddress
    if (accountAddress) {
      return all
        .filter((s) => {
          // If record has accountAddress, match it
          if (s.accountAddress) {
            return s.accountAddress.toLowerCase() === accountAddress.toLowerCase();
          }
          // If record doesn't have accountAddress, check if it's from localStorage wallet state
          // For backward compatibility, we'll include records without accountAddress
          // but only if no accountAddress filter is applied (which we are applying)
          return false; // Exclude records without accountAddress when filtering
        })
        .map((s) => ({
          ...s,
          accountAddress: s.accountAddress || "", // Ensure field exists
        })) as SalarySubmission[];
    }
    return all.map((s) => ({
      ...s,
      accountAddress: s.accountAddress || "", // Ensure field exists for old records
    })) as SalarySubmission[];
  } catch {
    return [];
  }
}

export function getSubmissionById(id: string, accountAddress?: string): SalarySubmission | undefined {
  const submissions = getSubmissions(accountAddress);
  return submissions.find((s) => s.id === id);
}

export function deleteSubmission(id: string, accountAddress?: string): void {
  const submissions = accountAddress ? getSubmissions(accountAddress) : getSubmissions();
  const filtered = submissions.filter((s) => s.id !== id);
  // Update storage with all submissions except deleted one
  const all = getSubmissions();
  const allFiltered = all.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allFiltered));
}

