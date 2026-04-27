"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, ThumbsUp, ThumbsDown, Rss } from "lucide-react";
import Link from "next/link";

interface Idea {
  id: string;
  title: string;
  description: string;
  status: "planlanan" | "devam_eden" | "yayinlanan";
  net_votes: number;
  email: string;
  created_at: string;
}

interface UserVote {
  idea_id: string;
  vote_type: number;
}

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [popularIdeas, setPopularIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userVotes, setUserVotes] = useState<Map<string, number>>(new Map());
  const [ip, setIp] = useState("");

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => setIp(data.ip));
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, []);

  useEffect(() => {
    if (ip) {
      fetchUserVotes();
    }
  }, [ip, ideas]);

  async function fetchIdeas() {
    const { data } = await supabase
      .from("ideas")
      .select("*")
      .eq("is_published", true)  // 🟢 SADECE ONAYLANANLAR
      .order("net_votes", { ascending: false });
    
    if (data) {
      setIdeas(data);
      const sorted = [...data].sort((a, b) => b.net_votes - a.net_votes);
      setPopularIdeas(sorted.slice(0, 5));
    }
  }

  async function fetchUserVotes() {
    const { data } = await supabase
      .from("votes")
      .select("idea_id, vote_type")
      .eq("ip_address", ip);
    
    if (data) {
      const voteMap = new Map();
      data.forEach((v: UserVote) => voteMap.set(v.idea_id, v.vote_type));
      setUserVotes(voteMap);
    }
  }

  async function handleVote(ideaId: string, voteType: number) {
    if (!ip) {
      alert("IP adresiniz alınamadı, biraz sonra tekrar deneyin.");
      return;
    }

    const currentVote = userVotes.get(ideaId);
    
    if (currentVote === voteType) {
      const { error } = await supabase
        .from("votes")
        .delete()
        .eq("idea_id", ideaId)
        .eq("ip_address", ip);
      
      if (error) {
        alert("Oy kaldırma hatası: " + error.message);
        return;
      }
    } 
    else if (currentVote && currentVote !== voteType) {
      const { error } = await supabase
        .from("votes")
        .update({ vote_type: voteType })
        .eq("idea_id", ideaId)
        .eq("ip_address", ip);
      
      if (error) {
        alert("Oy güncelleme hatası: " + error.message);
        return;
      }
    }
    else {
      const { error } = await supabase
        .from("votes")
        .insert({ idea_id: ideaId, ip_address: ip, vote_type: voteType });
      
      if (error) {
        alert("Oy verme hatası: " + error.message);
        return;
      }
    }

    await fetchIdeas();
    await fetchUserVotes();
  }

  const filteredIdeas = ideas.filter(idea => {
    const matchesStatus = filter === "all" || idea.status === filter;
    const matchesSearch = idea.title.toLowerCase().includes(search.toLowerCase()) ||
                          idea.description.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const planlanan = filteredIdeas.filter(i => i.status === "planlanan");
  const devamEden = filteredIdeas.filter(i => i.status === "devam_eden");
  const yayinlanan = filteredIdeas.filter(i => i.status === "yayinlanan");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Buton sağ üstte */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alfabe Mail Projesi - Yol Haritası</h1>
              <p className="text-gray-600 mt-1">
                Fikirlere oy vererek önceliklendirmemize yardımcı olun. Sizin fikirleriniz minik yazılımcılarımızın ilham kaynağı olacaktır.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-5 h-5" />
              Fikir Öner
            </button>
              
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* İstatistikler */}
        <div className="flex gap-4 mb-6">
          <div className="bg-white rounded-lg px-6 py-3 shadow-sm">
            <span className="text-2xl font-bold text-purple-600">{planlanan.length}</span>
            <span className="ml-2 text-gray-600">Planlanan</span>
          </div>
          <div className="bg-white rounded-lg px-6 py-3 shadow-sm">
            <span className="text-2xl font-bold text-blue-600">{devamEden.length}</span>
            <span className="ml-2 text-gray-600">Devam Eden</span>
          </div>
          <div className="bg-white rounded-lg px-6 py-3 shadow-sm">
            <span className="text-2xl font-bold text-green-600">{yayinlanan.length}</span>
            <span className="ml-2 text-gray-600">Yayınlanan</span>
          </div>
        </div>

        {/* Popüler Fikirler Bölümü */}
        {popularIdeas.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-8 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              🔥 Popüler Fikirler
            </h2>
            <div className="space-y-3">
              {popularIdeas.map((idea, index) => (
                <div key={idea.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</span>
                    <div>
                      <div className="font-medium text-gray-900">{idea.title}</div>
                      <div className="text-sm text-gray-500">{idea.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-600">{idea.net_votes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Arama ve Filtre */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Fikir ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg transition ${filter === "all" ? "bg-purple-600 text-white" : "bg-white text-gray-600 border"}`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter("planlanan")}
              className={`px-4 py-2 rounded-lg transition ${filter === "planlanan" ? "bg-purple-600 text-white" : "bg-white text-gray-600 border"}`}
            >
              Planlanan
            </button>
            <button
              onClick={() => setFilter("devam_eden")}
              className={`px-4 py-2 rounded-lg transition ${filter === "devam_eden" ? "bg-purple-600 text-white" : "bg-white text-gray-600 border"}`}
            >
              Devam Eden
            </button>
            <button
              onClick={() => setFilter("yayinlanan")}
              className={`px-4 py-2 rounded-lg transition ${filter === "yayinlanan" ? "bg-purple-600 text-white" : "bg-white text-gray-600 border"}`}
            >
              Yayınlanan
            </button>
          </div>
        </div>

        {/* 3 Sütunlu Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">📋 Planlanan ({planlanan.length})</h2>
            <div className="space-y-3">
              {planlanan.map(idea => (
                <IdeaCard key={idea.id} idea={idea} userVote={userVotes.get(idea.id)} onVote={handleVote} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">🚧 Devam Eden ({devamEden.length})</h2>
            <div className="space-y-3">
              {devamEden.map(idea => (
                <IdeaCard key={idea.id} idea={idea} userVote={userVotes.get(idea.id)} onVote={handleVote} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">✅ Yayınlanan ({yayinlanan.length})</h2>
            <div className="space-y-3">
              {yayinlanan.map(idea => (
                <IdeaCard key={idea.id} idea={idea} userVote={userVotes.get(idea.id)} onVote={handleVote} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && <IdeaModal onClose={() => setShowModal(false)} onSuccess={fetchIdeas} />}
    
    {/* FOOTER - Koyu renkli, profesyonel */}
<footer className="bg-gray-900 text-gray-300 mt-20">
  <div className="max-w-7xl mx-auto px-4 py-12">
    {/* Üst kısım: Logo + Linkler + İletişim */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Logo + Açıklama */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-3">Alfabe</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Alfabe mail sistemi olarak geliştirme yol haritamız. Bizlere destek olun. Planlanan, devam eden ve yayınlanan özellikleri takip edin. Uygulamamızı test edin ve görüşlerinizi belirtin.
        </p>
        <br/>
        <Link href="/rss.xml">
          <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2">
            <Rss className="w-5 h-5" />
            RSS
          </button>
        </Link>
      </div>
      
      {/* Linkler */}
      <div>
        <h3 className="text-white font-semibold mb-3">Keşfet</h3>
        <ul className="space-y-2 text-sm">
          <li><Link href="/" className="hover:text-purple-400 transition">Ana Sayfa</Link></li>
          <li><Link href="/admin" className="hover:text-purple-400 transition">Admin Paneli</Link></li>
        </ul>
      </div>
      
      {/* İletişim / Sosyal */}
      <div>
        <h3 className="text-white font-semibold mb-3">İletişim</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span>📧</span>
            <a href="mailto:info@alfabe.co" className="hover:text-purple-400 transition">info@alfabe.co</a>
          </li>
          <li className="flex items-center gap-2">
            <span>🐦</span>
            <a href="#" className="hover:text-purple-400 transition">Twitter</a>
          </li>
          <li className="flex items-center gap-2">
            <span>💼</span>
            <a href="#" className="hover:text-purple-400 transition">LinkedIn</a>
          </li>
          <li className="flex items-center gap-2">
            <span>📘</span>
            <a href="#" className="hover:text-purple-400 transition">Instagram</a>
          </li>
        </ul>
      </div>      
    </div>

    
    
    {/* Copyright */}
    <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} alfabe.co - Tüm hakları saklıdır.
    </div>
  </div>
</footer>
    </div>
  );
}

// Idea Card Komponenti (tıklanabilir hale geldi)
function IdeaCard({ idea, onVote, hasVoted }: { idea: Idea; onVote: (id: string, type: number) => void; hasVoted: boolean }) {
  const statusColors = {
    planlanan: "bg-yellow-100 text-yellow-800",
    devam_eden: "bg-blue-100 text-blue-800",
    yayinlanan: "bg-green-100 text-green-800"
  };

  const statusText = {
    planlanan: "Planlandı",
    devam_eden: "Devam Ediyor",
    yayinlanan: "Yayınlandı"
  };

  return (
    <Link href={`/idea/${idea.id}`}>
      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
        <h3 className="font-semibold text-gray-900 mb-1">{idea.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{idea.description}</p>
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[idea.status]}`}>
            {statusText[idea.status]}
          </span>
          
          {/* Oy verme butonları - tıklama event'inin Link'e gitmesini engelle */}
          <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVote(idea.id, 1);
              }}
              disabled={hasVoted}
              className={`flex items-center gap-1 px-2 py-1 rounded transition ${
                hasVoted 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-purple-50 text-purple-600 hover:bg-purple-100"
              }`}
            >
              <span className="text-sm">👍</span>
              <span className="text-sm font-medium">{idea.net_votes}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Idea Modal
function IdeaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    const token = Math.random().toString(36).substring(7);
    
    const { error } = await supabase.from("pending_ideas").insert({
      title,
      description,
      email,
      token
    });

    if (error) {
      alert("Hata oluştu: " + error.message);
    } else {
      alert(`Doğrulama linki: ${window.location.origin}/verify?token=${token}`);
      onSuccess();
      onClose();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Yeni Fikir Öner</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Fikir başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded mb-3"
            required
          />
          <textarea
            placeholder="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded mb-3"
            rows={3}
            required
          />
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
              {loading ? "Gönderiliyor..." : "Gönder"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300">
              İptal
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
}