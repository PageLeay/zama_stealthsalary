"use client";
import React from "react";
import { Navbar } from "@/components/Navbar";
import { Insights } from "@/components/Insights";

export default function InsightsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass rounded-lg p-8">
          <Insights />
        </div>
      </div>
    </main>
  );
}


