"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function ApiTestPage() {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function testApi() {
      try {
        const result = await apiFetch("/v1/elders");
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    }

    testApi();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F7F4] p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-[#263331]">
          API Connection Test
        </h1>

        {error ? (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            <strong>Error:</strong> {error}
          </div>
        ) : (
          <pre className="mt-6 overflow-auto rounded-xl bg-white p-5 text-sm text-[#263331] shadow-sm">
            {data
              ? JSON.stringify(data, null, 2)
              : "Loading elders from backend..."}
          </pre>
        )}
      </div>
    </main>
  );
}