"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function Verify() {
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

const { error: insertError } = await supabase.from("ideas").insert({
  title: data.title,
  description: data.description,
  email: data.email,
  email_verified: true,
  status: "planlanan",
  is_published: false  // 🟢 BURASI ÖNEMLİ - siteye otomatik düşmesin
});

if (insertError) {
    // 🔴 DETAYLI HATA LOG'U - BUNU KOPYALA
    console.error("=== INSERT ERROR DETAILS ===");
    console.error("Hata kodu:", insertError.code);
    console.error("Hata mesajı:", insertError.message);
    console.error("Detay:", insertError.details);
    console.error("Hata objesinin tamamı:", JSON.stringify(insertError, null, 2));
    console.error("Gönderilmeye çalışılan veri:", {
      title: data.title,
      description: data.description,
      email: data.email,
      email_verified: true,
      status: "planlanan"
    });
    // 🔴 BUNU ALERT İÇİNDE DE GÖSTER
    alert(`Ideas'a yazamadı!\n\nHata: ${insertError.message}\nKod: ${insertError.code}`);
    return;
  }

  await supabase
    .from("pending_ideas")
    .delete()
    .eq("id", data.id);

  alert("Fikir eklendi 🎉");
}

  return <div className="p-10">Doğrulanıyor...</div>;
}