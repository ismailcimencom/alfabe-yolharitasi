# Alfabe Yol Haritası - Proje Başlangıç Planı

## Projenin Amacı
Kullanıcıların fikir önerebildiği, oylayabildiği, yorum yapabildiği bir platform. Admin ve yazılımcılar fikirleri yönetir.

## Teknoloji
- Next.js 14 (App Router)
- Supabase (Auth, Database, Storage)
- Tailwind CSS
- Resend (E-posta)

## İstenen Basit Akış

### Kullanıcı tarafı:
1. Fikir önerir → e-posta doğrulaması gider
2. E-postayı onaylar → Fikir **doğrudan `ideas` tablosuna** `is_published = false` olarak kaydedilir
3. Fikir admin panelinde **"Planlanan"** sekmesinde görünür

### Admin / Yazılımcı tarafı:
1. Admin "Planlanan" sekmesinde fikri görür
2. **"Onayla"** butonuna basınca `is_published = true` olur → **Site ana sayfasında görünür**
3. **"Başla"** butonu ile statü `devam_eden` olur
4. **"Yayınla"** butonu ile statü `yayinlanan` olur
5. **Yazılımcı atama** (dropdown ile) sadece admin tarafından yapılır

## İstenmeyen Karmaşıklıklar (KAÇIN)
- Bildirim sistemi (ilk aşamada yok)
- Bekleyen fikir listesi (fazla katman)
- RLS ile fazla uğraşmak
- Service role karmaşası

## İlk Oturumda Yapılacaklar (Özet)
1. Tabloları oluştur (`ideas`, `pending_ideas`, `votes`, `comments`)
2. RLS'yi basit tut (`FOR INSERT WITH CHECK (true)`)
3. E-posta doğrulama (Resend veya basit token)
4. Admin paneli ile durum değiştirme
5. Upvote/downvote sistemi
6. Detay sayfası (yorum, görüntülenme)

## Dosya Yapısı
- `app/page.tsx` – Ana sayfa
- `app/admin/page.tsx` – Admin paneli
- `app/idea/[id]/page.tsx` – Detay sayfası
- `app/verify/page.tsx` – E-posta onay sayfası
- `lib/supabase.ts` – Supabase client