"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";

interface Message {
  id: string;
  content: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userName, setUserName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && isOpen) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [user, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsVisible(false);
      return;
    }
    
    // Kullanıcının admin veya yazılımcı olup olmadığını kontrol et
    const { data: member } = await supabase
      .from("team_members")
      .select("full_name, is_active")
      .eq("email", user.email)
      .single();
    
    if (member && member.is_active) {
      setUser(user);
      setUserName(member.full_name || user.email?.split('@')[0]);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);
    
    if (data) {
      setMessages(data);
      // Sadece kapalıyken unread sayısını hesapla
      if (!isOpen) {
        const newUnread = data.filter(m => m.user_email !== user?.email).length;
        setUnreadCount(newUnread);
      }
    }
  }

  function subscribeToMessages() {
    const subscription = supabase
      .channel("chat_messages")
      .on("postgres_changes", 
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (!isOpen && newMsg.user_email !== user?.email) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const { error } = await supabase
      .from("chat_messages")
      .insert({
        user_email: user.email,
        user_name: userName,
        content: newMessage.trim()
      });
    
    if (!error) {
      setNewMessage("");
      if (!isOpen) setIsOpen(true);
    }
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setUnreadCount(0);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Sohbet butonu (kapalıyken) */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all z-50 flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Sohbet penceresi (açıkken) */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden border">
          {/* Header */}
          <div className="bg-purple-600 text-white p-3 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">💬 Yazılımcı Ekip Sohbeti</h3>
              <p className="text-xs opacity-90">Tüm yazılımcılar buradan konuşabilirsiniz.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-purple-500 p-1 rounded transition"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleOpen}
                className="hover:bg-purple-500 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mesaj alanı */}
          {!isMinimized && (
            <>
              <div className="h-80 overflow-y-auto p-3 bg-gray-50 flex flex-col">
                {messages.map((msg) => (
                  <div key={msg.id} className={`mb-2 flex ${msg.user_email === user.email ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-2 ${msg.user_email === user.email ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-800"}`}>
                      <div className="text-xs font-bold">
                        {msg.user_name || msg.user_email?.split('@')[0]}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                      <div className={`text-xs mt-1 ${msg.user_email === user.email ? "text-purple-200" : "text-gray-500"}`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Mesaj gönderme formu */}
              <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* Küçültülmüş halde sadece başlık */}
          {isMinimized && (
            <div className="p-3 text-center text-sm text-gray-500 border-t">
              Sohbet küçültüldü. Açmak için ⬆️ tıklayın.
            </div>
          )}
        </div>
      )}
    </>
  );
}