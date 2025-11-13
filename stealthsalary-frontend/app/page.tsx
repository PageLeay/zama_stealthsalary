"use client";
import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Page() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            StealthSalary: Private Salary Insights
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Submit salaries privately. See aggregated insights securely.
          </p>
          <p className="text-base text-gray-400 max-w-2xl mx-auto mb-12">
            Leverage FHEVM to submit encrypted salary data. Our system aggregates statistics
            in encrypted form—averages, medians, and distributions—without revealing any individual data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/submit" className="btn-primary inline-block text-center">
              Submit Your Salary
            </Link>
            <Link href="/insights" className="btn-primary inline-block text-center bg-gradient-to-r from-cyan-500 to-teal-500">
              View Insights
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-white">🔒 Privacy First</h3>
            <p className="text-gray-300 text-sm">
              All salary data is encrypted before submission. No individual data is ever exposed.
            </p>
          </div>
          <div className="glass rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-white">📊 Aggregated Insights</h3>
            <p className="text-gray-300 text-sm">
              View average, median, and distribution statistics computed entirely in encrypted form.
            </p>
          </div>
          <div className="glass rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3 text-white">🌐 Decentralized</h3>
            <p className="text-gray-300 text-sm">
              Built on blockchain with FHEVM. Transparent, verifiable, and trustless.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}



