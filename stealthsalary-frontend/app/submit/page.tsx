"use client";
import React from "react";
import { Navbar } from "@/components/Navbar";
import { SalarySubmit } from "@/components/SalarySubmit";

export default function SubmitPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass rounded-lg p-8">
          <SalarySubmit />
        </div>
      </div>
    </main>
  );
}


