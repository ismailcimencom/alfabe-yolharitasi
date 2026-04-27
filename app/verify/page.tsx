"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

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
    const { data } = await supabase
      .from("pending_ideas")
      .select("*")
      .eq("token", token)
      .single();

    if (!data) {
      alert("Geçersiz link");
      return;
    }

    // 🔧 supabaseAdmin ile INSERT (RLS'yi bypass eder)
    const { error: insertError } = await supabase.from("ideas").insert({
      title: data.title,
      description: data.description,
      email: data.email,
      email_verified: true,
      status: "planlanan",
      is_published: false
    });

    if (insertError) {
      console.error("INSERT ERROR:", insertError);
      alert(`Ideas'a yazamadı: ${insertError.message}`);
      return;
    }

    await supabase
      .from("pending_ideas")
      .delete()
      .eq("id", data.id);

    alert("Fikir eklendi 🎉");
  }

  return <div className="p-10 text-center">Doğrulanıyor...</div>;
}