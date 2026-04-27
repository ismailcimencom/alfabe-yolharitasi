import { supabase } from "@/lib/supabase";

export async function GET() {
  // Sadece yayınlanmış fikirleri al
  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const baseUrl = "https://alfabe-yolharitasi.com"; // 🔴 KENDİ DOMAİNİNİ YAZ

  const feedItems = ideas?.map((idea) => `
    <item>
      <title><![CDATA[${idea.title}]]></title>
      <link>${baseUrl}/idea/${idea.id}</link>
      <guid>${baseUrl}/idea/${idea.id}</guid>
      <pubDate>${new Date(idea.created_at).toUTCString()}</pubDate>
      <description><![CDATA[${idea.description}]]></description>
      <category>${idea.status === "planlanan" ? "Planlanan" : idea.status === "devam_eden" ? "Devam Eden" : "Yayınlanan"}</category>
    </item>
  `).join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>Alfabe Yol Haritası</title>
      <link>${baseUrl}</link>
      <description>Alfabe olarak geliştirme yol haritamız. Planlanan, devam eden ve yayınlanan özellikleri takip edin.</description>
      <language>tr</language>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
      ${feedItems}
    </channel>
  </rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}