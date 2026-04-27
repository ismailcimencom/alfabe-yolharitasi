"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronRight, CheckCircle, PlayCircle, ListChecks, UserPlus, LogOut, Users, UserCheck, User, BarChart3, Bell } from "lucide-react";
import Link from "next/link";

interface Idea {
  id: string;
  title: string;
  description: string;
  status: "planlanan" | "devam_eden" | "yayinlanan";
  net_votes: number;
  email: string;
  created_at: string;
  assigned_to_email?: string | null;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  status: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export default function AdminPanel() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeMembers, setActiveMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Bildirim state'leri
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Bildirimleri çek
  async function fetchNotifications() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  }

  // Bildirimi okundu işaretle
  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  }

  // Tümünü okundu işaretle
  async function markAllAsRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user?.id);
    fetchNotifications();
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchIdeas();
        fetchTeamMembers();
        fetchNotifications();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchIdeas();
        fetchTeamMembers();
        fetchNotifications();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setIsAdmin(data?.role === "admin");
      }
    };
    checkAdmin();
  }, [user]);

  async function fetchIdeas() {
    const { data } = await supabase.from("ideas").select("*").order("created_at", { ascending: false });
    if (data) setIdeas(data);
  }

  async function fetchTeamMembers() {
    const { data } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
    if (data) {
      setTeamMembers(data);
      const active = data.filter(m => m.is_active === true);
      setActiveMembers(active);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Giriş hatası: " + error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    
    const { error } = await supabase.from("team_members").insert({
      email: inviteEmail,
      full_name: inviteName,
      status: "pending",
      is_active: false,
      invited_by: user?.id
    });

    if (error) {
      alert("Davet hatası: " + error.message);
    } else {
      alert(`✅ ${inviteEmail} bekleme listesine eklendi.`);
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
      fetchTeamMembers();
    }
  }

  async function updateStatus(ideaId: string, newStatus: "planlanan" | "devam_eden" | "yayinlanan") {
    const { error } = await supabase.from("ideas").update({ status: newStatus }).eq("id", ideaId);
    if (error) alert("Güncelleme hatası: " + error.message);
    else fetchIdeas();
  }

  async function assignDeveloper(ideaId: string, memberEmail: string | null) {
    const { error } = await supabase
      .from("ideas")
      .update({ assigned_to_email: memberEmail })
      .eq("id", ideaId);
    
    if (error) {
      alert("Atama hatası: " + error.message);
    } else {
      fetchIdeas();
    }
  }

  async function publishIdea(ideaId: string) {
    const { error } = await supabase
      .from("ideas")
      .update({ is_published: true })
      .eq("id", ideaId);
    
    if (error) {
      alert("Yayınlama hatası: " + error.message);
    } else {
      alert("✅ Fikir yayınlandı!");
      fetchIdeas();
    }
  }

  async function restartIdea(ideaId: string) {
    const { error } = await supabase
      .from("ideas")
      .update({ status: "planlanan", is_published: false })
      .eq("id", ideaId);
    
    if (error) {
      alert("Hata: " + error.message);
    } else {
      alert("🔄 Fikir başa alındı!");
      fetchIdeas();
    }
  }

  if (loading) return <div className="text-center py-20">Yükleniyor...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Paneli</h1>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded mb-3" required />
            <input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" required />
            <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  const planlanan = ideas.filter(i => i.status === "planlanan");
  const devamEden = ideas.filter(i => i.status === "devam_eden");
  const yayinlanan = ideas.filter(i => i.status === "yayinlanan");
  const pendingMembers = teamMembers.filter(m => m.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8 relative">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Paneli</h1>
            <p className="text-gray-600">Hoş geldin, {user.email}</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* 🔔 BİLDİRİM BUTONU */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* BİLDİRİM PANELİ */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto border">
                  <div className="p-3 border-b font-semibold flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800">
                    <span>Bildirimler</span>
                    {notifications.length > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-purple-600 hover:underline">
                        Tümünü okundu işaretle
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Henüz bildirim yok</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 border-b hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition ${
                          !n.is_read ? "bg-purple-50 dark:bg-purple-900/20" : ""
                        }`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="font-medium text-sm">{n.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleString("tr-TR")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Link href="/dashboard">
              <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </button>
            </Link>
            <Link href="/profile">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Profilim
              </button>
            </Link>
            <button onClick={() => setShowInvite(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Yazılımcı Ekle
            </button>
            <button onClick={handleLogout} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Çıkış
            </button>
          </div>
        </div>

        {pendingMembers.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-yellow-700" />
              Bekleyen Yazılımcılar ({pendingMembers.length})
            </h2>
            <div className="space-y-2">
              {pendingMembers.map(member => (
                <div key={member.id} className="flex justify-between items-center bg-white p-3 rounded">
                  <div>
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </div>
                  <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">⏳ Bekliyor</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMembers.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <UserCheck className="w-5 h-5 text-green-700" />
              Aktif Yazılımcılar ({activeMembers.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map(member => (
                <span key={member.id} className="bg-white px-3 py-1 rounded-full text-sm border border-green-200">
                  {member.full_name || member.email}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-800">{planlanan.length}</div>
            <div className="text-yellow-700">Planlanan</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-800">{devamEden.length}</div>
            <div className="text-blue-700">Devam Eden</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-800">{yayinlanan.length}</div>
            <div className="text-green-700">Yayınlanan</div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📋 Planlanan ({planlanan.length})</h2>
          <IdeasTable 
            ideas={planlanan} 
            onStatusChange={updateStatus} 
            onAssign={assignDeveloper}
            onPublish={publishIdea}
            onRestart={restartIdea}
            onUpdateIdea={fetchIdeas}
            nextStatus="devam_eden" 
            nextStatusText="Başla" 
            nextStatusColor="blue"
            developers={activeMembers}
            isAdmin={isAdmin}
          />
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🚧 Devam Eden ({devamEden.length})</h2>
          <IdeasTable 
            ideas={devamEden} 
            onStatusChange={updateStatus} 
            onAssign={assignDeveloper}
            onPublish={publishIdea}
            onRestart={restartIdea}
            onUpdateIdea={fetchIdeas}
            nextStatus="yayinlanan" 
            nextStatusText="Yayınla" 
            nextStatusColor="green"
            developers={activeMembers}
            isAdmin={isAdmin}
          />
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">✅ Yayınlanan ({yayinlanan.length})</h2>
          <IdeasTable 
            ideas={yayinlanan} 
            onStatusChange={updateStatus} 
            onAssign={assignDeveloper}
            onPublish={publishIdea}
            onRestart={restartIdea}
            onUpdateIdea={fetchIdeas}
            nextStatus={null} 
            nextStatusText="Tamamlandı" 
            nextStatusColor="gray" 
            developers={activeMembers}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Yazılımcı Ekle</h2>
            <form onSubmit={handleInvite}>
              <input type="text" placeholder="Ad Soyad" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full p-2 border rounded mb-3" required />
              <input type="email" placeholder="E-posta" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full p-2 border rounded mb-4" required />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">Ekle</button>
                <button type="button" onClick={() => setShowInvite(false)} className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300">İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// IdeasTable Komponenti (hatasız)
function IdeasTable({ ideas, onStatusChange, onAssign, onPublish, onRestart, nextStatus, nextStatusText, nextStatusColor, developers = [], onUpdateIdea, isAdmin }: any) {
  const [editingIdea, setEditingIdea] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  if (ideas.length === 0) return <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Henüz fikir yok</div>;
  
  const maskEmail = (email: string) => {
    if (!email) return "";
    const [local, domain] = email.split('@');
    if (local.length <= 3) return email;
    const maskedLocal = local.slice(0, 3) + '*'.repeat(Math.min(local.length - 3, 5));
    return `${maskedLocal}@${domain}`;
  };

  const getDeveloperInfo = (assignedEmail: string | null) => {
    if (!assignedEmail) return null;
    return developers.find((d: any) => d.email === assignedEmail);
  };

 const startEdit = (idea: any) => {
    setEditingIdea(idea);
    setEditTitle(idea.title);
    setEditDescription(idea.description);
  };

  const saveEdit = async () => {
    if (!editingIdea) return;
    const { error } = await supabase.from("ideas").update({ title: editTitle, description: editDescription }).eq("id", editingIdea.id);
    if (error) {
      alert("Güncelleme hatası: " + error.message);
    } else {
      setEditingIdea(null);
      if (onUpdateIdea) onUpdateIdea();
      else window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fikir</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">E-posta</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Oy</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Atanan</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea: Idea) => {
            const assignedDev = getDeveloperInfo(idea.assigned_to_email ?? null);
            const isEditing = editingIdea?.id === idea.id;
            return (
              <tr key={idea.id}>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <div className="space-y-1">
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-1 text-xs border rounded" />
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-1 text-xs border rounded" rows={2} />
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">Kaydet</button>
                        <button onClick={() => setEditingIdea(null)} className="bg-gray-400 text-white px-2 py-0.5 rounded text-xs">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-sm">{idea.title}</div>
                      <div className="text-xs text-gray-500">{idea.description?.substring(0, 80)}</div>
                      <button onClick={() => startEdit(idea)} className="text-blue-500 text-xs mt-0.5 hover:underline">✏️ Düzenle</button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{maskEmail(idea.email)}</td>
                <td className="px-3 py-2 text-sm font-semibold">👍 {idea.net_votes}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      {assignedDev ? (
                        <img src={assignedDev.avatar_url || `https://ui-avatars.com/api/?background=6366f1&color=fff&bold=true&size=60&name=${encodeURIComponent(assignedDev.full_name || assignedDev.email)}`} alt="Avatar" className="w-[60px] h-[60px] rounded-full object-cover border-2 border-purple-200" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?background=6366f1&color=fff&bold=true&size=60&name=${encodeURIComponent(assignedDev.full_name || assignedDev.email)}`; }} />
                      ) : (
                        <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200"><span className="text-gray-400 text-xs">?</span></div>
                      )}
                      {assignedDev ? (
                        <span className="text-sm font-medium">{assignedDev.full_name || assignedDev.email?.split('@')[0]}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Atanmamış</span>
                      )}
                    </div>
                    {isAdmin && (
                      <select value={idea.assigned_to_email || ""} onChange={(e) => onAssign(idea.id, e.target.value || null)} className="text-xs border rounded px-2 py-1 bg-white w-full">
                        <option value="">Değiştir / Ata</option>
                        {developers.map((dev: any) => (<option key={dev.id} value={dev.email}>{dev.full_name || dev.email?.split('@')[0]}</option>))}
                      </select>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {nextStatus === "devam_eden" && (
                      <>
                        <button onClick={() => onPublish(idea.id)} className="bg-green-500 text-white px-2 py-0.5 rounded text-xs hover:opacity-80">✓ Onayla</button>
                        <button onClick={() => onStatusChange(idea.id, nextStatus)} className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs hover:opacity-80">→ Başla</button>
                      </>
                    )}
                    {nextStatus === "yayinlanan" && (
                      <>
                        <button onClick={() => onStatusChange(idea.id, "planlanan")} className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs hover:opacity-80">↺ Geri Al</button>
                        <button onClick={() => onStatusChange(idea.id, nextStatus)} className="bg-blue-500 text-white px-2 py-0.5 rounded text-xs hover:opacity-80">→ Yayınla</button>
                      </>
                    )}
                    {!nextStatus && (
                      <>
                        <button onClick={() => onStatusChange(idea.id, "devam_eden")} className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs hover:opacity-80">↺ Geri Al</button>
                        <button onClick={() => onRestart(idea.id)} className="bg-purple-500 text-white px-2 py-0.5 rounded text-xs hover:opacity-80">🔄 Baştan Başla</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}