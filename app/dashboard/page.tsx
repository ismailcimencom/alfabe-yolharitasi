"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { 
  BarChart3, 
  Eye, 
  MessageCircle, 
  ThumbsUp, 
  Clock, 
  Trophy,
  ListChecks,
  PlayCircle,
  CheckCircle
} from "lucide-react";

interface DashboardStats {
  totalIdeas: number;
  planlanan: number;
  devamEden: number;
  yayinlanan: number;
  mostVotedIdea: { title: string; net_votes: number; id: string } | null;
  mostViewedIdea: { title: string; view_count: number; id: string } | null;
  mostCommentedIdea: { title: string; comment_count: number; id: string } | null;
  topDeveloper: { full_name: string; assigned_count: number } | null;
  recentIdeas: { id: string; title: string; created_at: string; status: string }[];
  weeklyIdeas: { week: string; count: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = "/admin";
      return;
    }
    
    setUser(user);
    
    // Admin kontrolü
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    setIsAdmin(data?.role === "admin");
    fetchStats();
  }

  async function fetchStats() {
    setLoading(true);
    
    // 1. Toplam fikir sayıları
    const { data: allIdeas } = await supabase.from("ideas").select("*");
    const totalIdeas = allIdeas?.length || 0;
    const planlanan = allIdeas?.filter(i => i.status === "planlanan").length || 0;
    const devamEden = allIdeas?.filter(i => i.status === "devam_eden").length || 0;
    const yayinlanan = allIdeas?.filter(i => i.status === "yayinlanan").length || 0;
    
    // 2. En çok oy alan fikir
    const mostVoted = allIdeas?.reduce((prev, current) => 
      (prev.net_votes > current.net_votes) ? prev : current, { net_votes: -Infinity, title: "", id: "" });
    
    // 3. En çok görüntülenen fikir
    const mostViewed = allIdeas?.reduce((prev, current) => 
      (prev.view_count > current.view_count) ? prev : current, { view_count: -Infinity, title: "", id: "" });
    
    // 4. En çok yorum alan fikir
    const { data: comments } = await supabase.from("comments").select("idea_id");
    const commentCounts = comments?.reduce((acc: any, c) => {
      acc[c.idea_id] = (acc[c.idea_id] || 0) + 1;
      return acc;
    }, {});
    
    let mostCommented = null;
    if (commentCounts && allIdeas) {
      let maxCount = 0;
      let maxIdea = null;
      for (const idea of allIdeas) {
        const count = commentCounts[idea.id] || 0;
        if (count > maxCount) {
          maxCount = count;
          maxIdea = { title: idea.title, comment_count: count, id: idea.id };
        }
      }
      mostCommented = maxIdea;
    }
    
    // 5. En aktif yazılımcı
    const assignedCounts: { [key: string]: number } = {};
    allIdeas?.forEach(idea => {
      if (idea.assigned_to_email) {
        assignedCounts[idea.assigned_to_email] = (assignedCounts[idea.assigned_to_email] || 0) + 1;
      }
    });
    
    let topDeveloper = null;
    let maxAssigned = 0;
    let topEmail = "";
    for (const [email, count] of Object.entries(assignedCounts)) {
      if (count > maxAssigned) {
        maxAssigned = count;
        topEmail = email;
      }
    }
    
    if (topEmail) {
      const { data: dev } = await supabase
        .from("team_members")
        .select("full_name")
        .eq("email", topEmail)
        .single();
      topDeveloper = { full_name: dev?.full_name || topEmail, assigned_count: maxAssigned };
    }
    
    // 6. Son 5 fikir
    const recentIdeas = allIdeas?.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5).map(i => ({
      id: i.id,
      title: i.title,
      created_at: i.created_at,
      status: i.status
    })) || [];
    
    // 7. Haftalık fikir istatistikleri (son 6 hafta)
    const weeklyData: { [key: string]: number } = {};
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i));
      const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
      weeklyData[weekKey] = 0;
    }
    
    allIdeas?.forEach(idea => {
      const ideaDate = new Date(idea.created_at);
      for (let i = 0; i < 6; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (today.getDay() + 7 * i));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        if (ideaDate >= weekStart && ideaDate < weekEnd) {
          const weekKey = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
          weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
          break;
        }
      }
    });
    
    const weeklyIdeas = Object.entries(weeklyData).map(([week, count]) => ({
      week: week.slice(5),
      count
    })).reverse();
    
    setStats({
      totalIdeas,
      planlanan,
      devamEden,
      yayinlanan,
      mostVotedIdea: mostVoted?.net_votes > -Infinity ? mostVoted : null,
      mostViewedIdea: mostViewed?.view_count > -Infinity ? mostViewed : null,
      mostCommentedIdea: mostCommented,
      topDeveloper,
      recentIdeas,
      weeklyIdeas
    });
    
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }
  
    // Admin kontrolü yok, sadece giriş kontrolü var
    if (!user) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erişim Engellendi</h1>
            <p className="text-gray-600 mb-4">Bu sayfayı görmek için giriş yapmalısınız.</p>
            <Link href="/admin" className="text-purple-600 hover:underline">← Giriş Yap</Link>
        </div>
        </div>
    );
    }

    // Eski admin kontrolü (artık çalışmaz, yorum satırı)
    /*
    if (!user || !isAdmin) {
    return ( ... );
    }
    */
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Başlık */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Genel istatistikler ve analizler</p>
          </div>
          <Link href="/admin" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            ← Admin Paneli
          </Link>
        </div>
        
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl font-bold">{stats?.totalIdeas}</div>
            <div className="text-sm opacity-90 mt-1">Toplam Fikir</div>
            <BarChart3 className="w-8 h-8 opacity-50 mt-2" />
          </div>
          <div className="bg-yellow-500 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl font-bold">{stats?.planlanan}</div>
            <div className="text-sm opacity-90 mt-1">📋 Planlanan</div>
          </div>
          <div className="bg-blue-500 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl font-bold">{stats?.devamEden}</div>
            <div className="text-sm opacity-90 mt-1">🚧 Devam Eden</div>
          </div>
          <div className="bg-green-500 rounded-xl shadow-lg p-6 text-white">
            <div className="text-3xl font-bold">{stats?.yayinlanan}</div>
            <div className="text-sm opacity-90 mt-1">✅ Yayınlanan</div>
          </div>
        </div>
        
        {/* En İyiler Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* En Çok Oylanan */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-gray-800">En Çok Oylanan</h2>
            </div>
            {stats?.mostVotedIdea && stats.mostVotedIdea.title ? (
              <Link href={`/idea/${stats.mostVotedIdea.id}`} className="block hover:text-purple-600">
                <p className="font-medium">{stats.mostVotedIdea.title}</p>
                <p className="text-sm text-gray-500 mt-1">👍 {stats.mostVotedIdea.net_votes} oy</p>
              </Link>
            ) : (
              <p className="text-gray-400">Henüz fikir yok</p>
            )}
          </div>
          
          {/* En Çok Görüntülenen */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">En Çok Görüntülenen</h2>
            </div>
            {stats?.mostViewedIdea && stats.mostViewedIdea.title ? (
              <Link href={`/idea/${stats.mostViewedIdea.id}`} className="block hover:text-purple-600">
                <p className="font-medium">{stats.mostViewedIdea.title}</p>
                <p className="text-sm text-gray-500 mt-1">👁️ {stats.mostViewedIdea.view_count} görüntülenme</p>
              </Link>
            ) : (
              <p className="text-gray-400">Henüz görüntülenme yok</p>
            )}
          </div>
          
          {/* En Çok Yorum Alan */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-800">En Çok Yorum Alan</h2>
            </div>
            {stats?.mostCommentedIdea && stats.mostCommentedIdea.title ? (
              <Link href={`/idea/${stats.mostCommentedIdea.id}`} className="block hover:text-purple-600">
                <p className="font-medium">{stats.mostCommentedIdea.title}</p>
                <p className="text-sm text-gray-500 mt-1">💬 {stats.mostCommentedIdea.comment_count} yorum</p>
              </Link>
            ) : (
              <p className="text-gray-400">Henüz yorum yok</p>
            )}
          </div>
        </div>
        
        {/* Haftalık Fikir Grafiği */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Haftalık Fikir Eklenme Sayısı (Son 6 Hafta)
          </h2>
          <div className="flex items-end gap-2 h-40">
            {stats?.weeklyIdeas.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-purple-500 rounded-t w-full max-w-[40px] mx-auto transition-all"
                  style={{ height: `${Math.max(4, item.count * 20)}px` }}
                />
                <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                  {item.week}
                </span>
                <span className="text-xs font-bold mt-1">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* En Aktif Yazılımcı & Son Fikirler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* En Aktif Yazılımcı */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h2 className="font-semibold text-gray-800">🏆 En Aktif Yazılımcı</h2>
            </div>
            {stats?.topDeveloper ? (
              <div>
                <p className="font-medium">{stats.topDeveloper.full_name}</p>
                <p className="text-sm text-gray-500 mt-1">📋 {stats.topDeveloper.assigned_count} fikir atandı</p>
              </div>
            ) : (
              <p className="text-gray-400">Henüz atama yapılmamış</p>
            )}
          </div>
          
          {/* Son Eklenen Fikirler */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Son Eklenen Fikirler
            </h2>
            <div className="space-y-3">
              {stats?.recentIdeas.map(idea => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="block hover:bg-gray-50 p-2 rounded transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{idea.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(idea.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      idea.status === "planlanan" ? "bg-yellow-100 text-yellow-700" :
                      idea.status === "devam_eden" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>
                      {idea.status === "planlanan" ? "Planlandı" :
                       idea.status === "devam_eden" ? "Devam Ediyor" : "Yayınlandı"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}