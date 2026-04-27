"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ThumbsUp, ThumbsDown, Eye, MessageCircle, ArrowLeft, User } from "lucide-react";

interface Idea {
  id: string;
  title: string;
  description: string;
  status: "planlanan" | "devam_eden" | "yayinlanan";
  net_votes: number;
  email: string;
  created_at: string;
  assigned_to_email?: string | null;
  view_count: number;
  is_published: boolean;
}

interface Comment {
  id: string;
  content: string;
  user_email: string;
  created_at: string;
}

interface Developer {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

export default function IdeaDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [assignedDev, setAssignedDev] = useState<Developer | null>(null);
  const [newComment, setNewComment] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userVote, setUserVote] = useState<number | null>(null);
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(true);

  // IP adresini al
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => setIp(data.ip));
  }, []);

  // Verileri yükle
  useEffect(() => {
    if (id && ip) {
      fetchIdea();
      fetchComments();
      fetchUserVote();
      incrementViewCount();
    }
  }, [id, ip]);

  async function fetchIdea() {
    const { data } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) {
      setIdea(data);
      
      // Atanan yazılımcıyı bul
      if (data.assigned_to_email) {
        const { data: devData } = await supabase
          .from("team_members")
          .select("*")
          .eq("email", data.assigned_to_email)
          .single();
        
        if (devData) {
          setAssignedDev(devData);
        }
      }
    }
    setLoading(false);
  }

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("idea_id", id)
      .order("created_at", { ascending: false });
    
    if (data) setComments(data);
  }

  async function fetchUserVote() {
    if (!ip) return;
    const { data } = await supabase
      .from("votes")
      .select("vote_type")
      .eq("idea_id", id)
      .eq("ip_address", ip)
      .single();
    
    if (data) setUserVote(data.vote_type);
  }

  async function incrementViewCount() {
    await supabase.rpc("increment_view_count", { idea_id: id });
  }

  async function handleVote(voteType: number) {
    if (!ip) {
      alert("IP adresiniz alınamadı.");
      return;
    }
    
    const currentVote = userVote;
    
    if (currentVote === voteType) {
      // Oyu kaldır
      await supabase
        .from("votes")
        .delete()
        .eq("idea_id", id)
        .eq("ip_address", ip);
    } else {
      // Yeni oy ekle veya güncelle
      await supabase
        .from("votes")
        .upsert({ 
          idea_id: id, 
          ip_address: ip, 
          vote_type: voteType 
        }, { 
          onConflict: "idea_id,ip_address" 
        });
    }
    
    await fetchIdea();
    await fetchUserVote();
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!userEmail.trim()) {
      alert("Lütfen e-posta adresinizi girin.");
      return;
    }
    
    const { error } = await supabase
      .from("comments")
      .insert({ 
        idea_id: id, 
        content: newComment, 
        user_email: userEmail 
      });
    
    if (!error) {
      setNewComment("");
      fetchComments();
    } else {
      alert("Yorum gönderilemedi: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Fikir bulunamadı</h1>
          <button onClick={() => router.back()} className="mt-4 text-purple-600 hover:underline">← Geri Dön</button>
        </div>
      </div>
    );
  }

  const statusText = {
    planlanan: "📋 Planlandı",
    devam_eden: "🚧 Devam Ediyor",
    yayinlanan: "✅ Yayınlandı"
  };

  const statusColor = {
    planlanan: "bg-yellow-100 text-yellow-800",
    devam_eden: "bg-blue-100 text-blue-800",
    yayinlanan: "bg-green-100 text-green-800"
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Geri butonu */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Geri Dön
        </button>
        
        {/* Ana Fikir Kartı */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{idea.title}</h1>
              <p className="text-gray-600 leading-relaxed">{idea.description}</p>
            </div>
            
            {/* Oy Butonları */}
            <div className="flex flex-col items-center gap-2 ml-4">
              <button
                onClick={() => handleVote(1)}
                className={`p-2 rounded-full transition ${userVote === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-green-50"}`}
              >
                <ThumbsUp className="w-5 h-5" />
              </button>
              <span className="text-xl font-bold">{idea.net_votes}</span>
              <button
                onClick={() => handleVote(-1)}
                className={`p-2 rounded-full transition ${userVote === -1 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-red-50"}`}
              >
                <ThumbsDown className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Meta Bilgiler */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{idea.view_count || 0} görüntülenme</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} yorum</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs ${statusColor[idea.status]}`}>
              {statusText[idea.status]}
            </div>
            <div className="text-xs text-gray-400">
              📅 {new Date(idea.created_at).toLocaleDateString("tr-TR")}
            </div>
          </div>
          
          {/* Atanan Yazılımcı */}
          {assignedDev && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              {assignedDev.avatar_url ? (
                <img src={assignedDev.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500">Üstlenen Yazılımcı</div>
                <div className="font-medium text-sm">{assignedDev.full_name || assignedDev.email?.split('@')[0]}</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Yorumlar Bölümü */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Yorumlar ({comments.length})
          </h2>
          
          {/* Yorum Ekleme Formu */}
          <form onSubmit={handleAddComment} className="mb-6">
            <input
              type="email"
              placeholder="E-posta adresiniz"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-purple-500"
              required
            />
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Yorumunuzu yazın..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={3}
              required
            />
            <button
              type="submit"
              className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Yorum Gönder
            </button>
          </form>
          
          {/* Yorum Listesi */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-purple-600">
                    {comment.user_email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{comment.content}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Henüz yorum yapılmamış. İlk yorumu sen yap!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}