"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
      // 1. Pending ideas'dan token ile veriyi al
      const { data: pending, error: fetchError } = await supabase
        .from("pending_ideas")
        .select("*")
        .eq("token", token)
        .single();

      if (fetchError || !pending) {
        setStatus("Geçersiz veya süresi dolmuş link");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      // 2. Ideas tablosuna ekle
      const { error: insertError } = await supabase
        .from("ideas")
        .insert({
          title: pending.title,
          description: pending.description,
          email: pending.email,
          email_verified: true,
          status: "planlanan",
          is_published: false
        });

      if (insertError) {
        console.error("Insert hatası:", insertError);
        setStatus("Bir hata oluştu: " + insertError.message);
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      // 3. Pending ideas'dan sil
      await supabase
        .from("pending_ideas")
        .delete()
        .eq("id", pending.id);

      setStatus("✅ Fikir başarıyla eklendi! Yönlendiriliyorsunuz...");
      setTimeout(() => router.push("/"), 1500);

    } catch (err) {
      console.error("Beklenmeyen hata:", err);
      setStatus("Bir hata oluştu, lütfen daha sonra tekrar deneyin");
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