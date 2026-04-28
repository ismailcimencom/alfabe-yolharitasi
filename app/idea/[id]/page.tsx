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
  is_approved: boolean;
}

interface Developer {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

function getReadableErrorMessage(error: unknown): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";
  if (typeof error === "string") return error;

  if (typeof error === "object") {
    const errorWithMessage = error as { message?: string; details?: string; hint?: string; code?: string };
    if (errorWithMessage.message) return errorWithMessage.message;
    if (errorWithMessage.details) return errorWithMessage.details;
    if (errorWithMessage.hint) return errorWithMessage.hint;
    if (errorWithMessage.code) return `Hata kodu: ${errorWithMessage.code}`;

    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  }

  return "Bilinmeyen bir hata oluştu.";
}

export default function IdeaDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [idea, setIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [assignedDev, setAssignedDev] = useState<Developer | null>(null);
  const [newComment, setNewComment] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // IP adresini al
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => setIp(data.ip))
      .catch(err => console.error("IP alınamadı:", err));
  }, []);

  // Verileri yükle
  useEffect(() => {
    if (id && id.length > 0 && ip) {
      // ID'nin UUID formatında olduğundan emin ol
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isValidUUID) {
        console.error("Geçersiz ID formatı:", id);
        setError(true);
        setLoading(false);
        return;
      }
      
      Promise.all([
        fetchIdea(),
        fetchComments(),
        fetchUserVote(),
        incrementViewCount()
      ]).finally(() => setLoading(false));
    } else if (id && id.length > 0 && !ip) {
      // IP hazır değilse bekle
      const timer = setTimeout(() => {
        if (ip) {
          Promise.all([
            fetchIdea(),
            fetchComments(),
            fetchUserVote(),
            incrementViewCount()
          ]).finally(() => setLoading(false));
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (!id || id.length === 0) {
      setError(true);
      setLoading(false);
    }
  }, [id, ip]);

  // Admin mi? (yorum silme butonu için)
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Admin kontrol hatası:", roleError);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data?.role === "admin");
      } catch (err) {
        console.error("Admin kontrol hatası:", err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  async function fetchIdea() {
    try {
      const { data, error: fetchError } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError || !data) {
        console.error("Fikir bulunamadı:", fetchError);
        setError(true);
        return;
      }
      
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
    } catch (err) {
      console.error("Fetch idea hatası:", err);
      setError(true);
    }
  }

  async function fetchComments() {
    try {
      const trimmedEmail = userEmail.trim();

      const approvedQuery = supabase
        .from("comments")
        .select("*")
        .eq("idea_id", id)
        .eq("is_approved", true);

      const pendingMineQuery =
        trimmedEmail.length > 0
          ? supabase
              .from("comments")
              .select("*")
              .eq("idea_id", id)
              .eq("is_approved", false)
              .eq("user_email", trimmedEmail)
          : null;

      const [{ data: approved }, pendingResult] = await Promise.all([
        approvedQuery,
        pendingMineQuery ?? Promise.resolve({ data: [] as any[] }),
      ]);

      const pendingMine = (pendingResult as any)?.data ?? [];

      const merged = [...(approved ?? []), ...(pendingMine ?? [])];
      merged.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setComments(merged);
    } catch (err) {
      console.error("Fetch comments hatası:", err);
    }
  }

  async function fetchUserVote() {
    if (!ip) return;
    try {
      const { data, error } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("idea_id", id)
        .eq("ip_address", ip)
        .maybeSingle();
      
      if (error) {
        console.error("Fetch vote hatası:", error);
        return;
      }
      setUserVote(data?.vote_type ?? null);
    } catch (err) {
      console.error("Fetch vote hatası:", err);
    }
  }

  async function incrementViewCount() {
    try {
      await supabase.rpc("increment_view_count", { idea_id: id });
    } catch (err) {
      console.error("Görüntülenme sayacı hatası:", err);
    }
  }

  async function handleVote(voteType: number) {
    if (!ip) {
      alert("IP adresiniz alınamadı.");
      return;
    }
    
    const currentVote = userVote;
    
    try {
      if (currentVote === voteType) {
        await supabase
          .from("votes")
          .delete()
          .eq("idea_id", id)
          .eq("ip_address", ip);
      } else {
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
    } catch (err) {
      console.error("Vote hatası:", err);
      alert("Oy verme işlemi sırasında bir hata oluştu.");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!isAdmin) return;
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (deleteError) {
        console.error("Yorum silme hatası:", deleteError);
        alert("Yorum silinemedi: " + (deleteError.message || "Bilinmeyen hata"));
        return;
      }

      await fetchComments();
    } catch (err) {
      console.error("Yorum silme hatası:", err);
      alert("Yorum silme sırasında bir hata oluştu.");
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) {
      alert("Lütfen bir yorum yazın.");
      return;
    }
    if (!userEmail.trim()) {
      alert("Lütfen e-posta adresinizi girin.");
      return;
    }

    if (!id || id.length === 0) {
      alert("Fikir ID'si bulunamadı. Lütfen ana sayfaya dönün.");
      return;
    }

    if (!id || id.length === 0) {
      alert("Fikir ID'si bulunamadı. Lütfen ana sayfaya dönün.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from("comments")
        .insert({ 
          idea_id: id, 
          content: newComment, 
          user_email: userEmail,
          is_approved: false
        });
      
      if (error) {
        const message = getReadableErrorMessage(error);
        console.error("Yorum hatası:", { message, rawError: error });
        alert("Yorum gönderilemedi: " + message);
        return;
      }

      alert("Yorumunuz alındı! Onaylandıktan sonra yayınlanacaktır.");
      setNewComment("");
      fetchComments();
    } catch (error) {
      const message = getReadableErrorMessage(error);
      console.error("Yorum hatası (beklenmeyen):", { message, rawError: error });
      alert("Yorum gönderilemedi: " + message);
    }
  }

  // Kullanıcı e-postasını girince, kendi onay bekleyen yorumlarını da göstermek için yeniden çek
  useEffect(() => {
    if (id && id.length > 0) fetchComments();
  }, [userEmail]);

  // Loading durumu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-purple-600 text-lg">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Hata durumu
  if (error || !idea) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Fikir bulunamadı</h1>
          <p className="text-gray-500 mt-2">Aradığınız fikir mevcut değil veya kaldırılmış olabilir.</p>
          <button 
            onClick={() => router.push("/")} 
            className="mt-4 text-purple-600 hover:underline"
          >
            ← Ana Sayfaya Dön
          </button>
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
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Geri Dön
        </button>
        
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{idea.title}</h1>
              <p className="text-gray-600 leading-relaxed">{idea.description}</p>
            </div>
            
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
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Yorumlar ({comments.length})
          </h2>
          
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
          
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-purple-600">
                    {comment.user_email?.split("@")[0]}
                  </span>
                  {!comment.is_approved && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Onay bekliyor
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString("tr-TR")}
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="ml-auto text-xs text-red-600 hover:underline"
                    >
                      Sil
                    </button>
                  )}
                </div>
                <p className="text-gray-700 text-sm">{comment.content}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Henüz onaylanmış yorum yok. İlk yorumu sen yap!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
