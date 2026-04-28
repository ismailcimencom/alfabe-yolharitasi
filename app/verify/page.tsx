"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Verify() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Doğrulanıyor...</div>}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState("Doğrulanıyor...");

  useEffect(() => {
    if (token) verify();
  }, [token]);

  async function verify() {
    try {
      const res = await fetch(`/api/verify?token=${token}`);
      const data = await res.json();

      if (res.ok) {
        setStatus("✅ Fikir başarıyla eklendi! Yönlendiriliyorsunuz...");
        setTimeout(() => router.push("/"), 1500);
      } else {
        setStatus("❌ " + (data.error || "Bir hata oluştu"));
        setTimeout(() => router.push("/"), 3000);
      }
    } catch {
      setStatus("❌ Bağlantı hatası, lütfen tekrar deneyin");
      setTimeout(() => router.push("/"), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="text-lg font-medium text-gray-700">{status}</div>
      </div>
    </div>
  );
}