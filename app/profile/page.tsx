"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Camera, Lock, LogOut, ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/admin");
      return;
    }
    
    setUser(user);
    await fetchProfile(user);
    setLoading(false);
  }

  async function fetchProfile(currentUser: any) {
    // Team_members'dan bilgileri al
    let { data: member } = await supabase
      .from("team_members")
      .select("*")
      .eq("email", currentUser.email)
      .single();
    
    // Kullanıcının rolünü al
    let { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();
    
    if (member) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email!,
        full_name: member.full_name || currentUser.email!.split('@')[0],
        avatar_url: member.avatar_url || null,
        role: roleData?.role || "developer",
        created_at: member.created_at
      });
      setFullName(member.full_name || "");
    } else {
      // Team_members'da kaydı yoksa oluştur
      const { data: newMember } = await supabase
        .from("team_members")
        .insert({
          email: currentUser.email,
          full_name: currentUser.email!.split('@')[0],
          is_active: true,
          status: "active"
        })
        .select()
        .single();
      
      if (newMember) {
        setProfile({
          id: currentUser.id,
          email: currentUser.email!,
          full_name: newMember.full_name,
          avatar_url: newMember.avatar_url,
          role: roleData?.role || "developer",
          created_at: newMember.created_at
        });
        setFullName(newMember.full_name);
      }
    }
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    
    const { error } = await supabase
      .from("team_members")
      .update({ full_name: fullName })
      .eq("email", user.email);
    
    if (error) {
      setMessage({ type: "error", text: "Güncelleme hatası: " + error.message });
    } else {
      setMessage({ type: "success", text: "Profil güncellendi!" });
      if (profile) setProfile({ ...profile, full_name: fullName });
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Yeni şifreler eşleşmiyor!" });
      return;
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Şifre en az 6 karakter olmalı!" });
      return;
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      setMessage({ type: "error", text: "Şifre değiştirme hatası: " + error.message });
    } else {
      setMessage({ type: "success", text: "Şifre başarıyla değiştirildi!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin");
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;
    
    setUploading(true);
    
    // Önce eski avatarı sil
    if (profile?.avatar_url) {
      const oldPath = profile.avatar_url.split('/').pop();
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    }
    
    // Yeni avatarı yükle
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    
    if (uploadError) {
      setMessage({ type: "error", text: "Yükleme hatası: " + uploadError.message });
      setUploading(false);
      return;
    }
    
    // Public URL'i al
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    
    // Team_members tablosunu güncelle
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ avatar_url: publicUrl })
      .eq("email", user.email);
    
    if (updateError) {
      setMessage({ type: "error", text: "Profil güncelleme hatası: " + updateError.message });
    } else {
      setMessage({ type: "success", text: "Profil fotoğrafı güncellendi!" });
      if (profile) setProfile({ ...profile, avatar_url: publicUrl });
    }
    
    setUploading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Yükleniyor...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Profil bulunamadı</h1>
          <button onClick={() => router.push("/admin")} className="mt-4 text-purple-600 hover:underline">
            ← Admin Paneline Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Geri Butonu */}
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Geri Dön
        </button>
        
        {/* Başlık */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profilim</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
        
        {/* Mesaj */}
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {message.text}
          </div>
        )}
        
        {/* Profil Kartı */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                />
              ) : (
                <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center border-4 border-purple-200">
                  <User className="w-12 h-12 text-purple-600" />
                </div>
              )}
              
              <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-purple-700 transition">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={uploading} />
              </label>
              {uploading && <div className="text-xs text-gray-500 mt-1">Yükleniyor...</div>}
            </div>
            
            <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
              <Mail className="w-4 h-4" />
              {profile.email}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4" />
              <span className={`text-xs px-2 py-1 rounded-full ${
                profile.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}>
                {profile.role === "admin" ? "Admin" : "Yazılımcı"}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Katılım: {new Date(profile.created_at).toLocaleDateString("tr-TR")}
            </div>
          </div>
        </div>
        
        {/* Profil Düzenleme Formu */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Profil Bilgileri
          </h2>
          <form onSubmit={updateProfile}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full p-2 border rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Profili Güncelle
            </button>
          </form>
        </div>
        
        {/* Şifre Değiştirme Formu */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Şifre Değiştir
          </h2>
          <form onSubmit={changePassword}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                minLength={6}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Şifreyi Değiştir
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}