"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { createClient } from '@supabase/supabase-js';

export default function Verify() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Doğrulanıyor...</div>}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const params = useSearchParams();
  const token = params.get("token");

  useEffect(() => {
    if (token) verify();
  }, [token]);

  async function verify() {
    // 1. Önce pending_ideas'dan veriyi al (normal client yeterli)
    const { data, error: fetchError } = await supabase
      .from("pending_ideas")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !data) {
      console.error("Fetch error:", fetchError);
      alert("Geçersiz link veya token bulunamadı");
      return;
    }

    // 2. Service role ile ideas'a ekle (401 hatasını bypass etmek için)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { error: insertError } = await supabaseAdmin.from("ideas").insert({
      title: data.title,
      description: data.description,
      email: data.email,
      email_verified: true,
      status: "planlanan",
      is_published: false
    });

    if (insertError) {
      console.error("INSERT ERROR:", insertError);
      alert(`Ideas'a yazamadı: ${insertError.message} (Kod: ${insertError.code})`);
      return;
    }

    // 3. Başarılıysa pending_ideas'dan sil
    await supabase
      .from("pending_ideas")
      .delete()
      .eq("id", data.id);

    alert("Fikir eklendi 🎉");
  }

  return <div className="p-10 text-center">Doğrulanıyor...</div>;
}