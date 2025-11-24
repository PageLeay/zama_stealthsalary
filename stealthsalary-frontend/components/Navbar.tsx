"use client";
import React from "react";
import Link from "next/link";
import { WalletConnect } from "./WalletConnect";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 glass-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            StealthSalary
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200">
              Home
            </Link>
            <Link href="/submit" className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200">
              Submit
            </Link>
            <Link href="/insights" className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200">
              Insights
            </Link>
            <Link href="/profile" className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200">
              My Profile
            </Link>
          </nav>
          <div className="flex items-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
}

