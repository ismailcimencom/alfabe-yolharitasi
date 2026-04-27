"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
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
      router.push("/");
      return;
    }

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
      alert("Fikir onaylanırken bir hata oluştu.");
      router.push("/");
      return;
    }

    await supabase
      .from("pending_ideas")
      .delete()
      .eq("id", data.id);

    alert("Fikir başarıyla eklendi! 🎉");
    router.push("/"); // 🟢 Ana sayfaya yönlendir
  }

  return <div className="p-10 text-center">Doğrulanıyor...</div>;
}