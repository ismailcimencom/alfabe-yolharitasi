// app/api/send-email/route.ts
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

// Resend istemcisini başlat (API Key'in .env.local'da veya Vercel'de olacak)
const resend = new Resend(process.env.RESEND_API_KEY);

// Bu satır çok önemli: Node.js runtime'da çalışmasını sağlar
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Frontend'den gelen verileri al
    const { to, token, title, description } = await request.json();

    // Doğrulama linkini oluştur
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://alfabe-yolharitasi.vercel.app';
    const verifyUrl = `${origin}/verify?token=${token}`;

    // E-posta içeriğini hazırla
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Fikir Doğrulama</title></head>
      <body style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Alfabe Yol Haritası</h2>
        <h3>Fikir Doğrulama</h3>
        <p><strong>Başlık:</strong> ${title}</p>
        <p><strong>Açıklama:</strong> ${description}</p>
        <p>Fikrinizi onaylamak için aşağıdaki butona tıklayın:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px;">Fikri Onayla</a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Bu e-posta otomatik olarak gönderilmiştir.</p>
      </body>
      </html>
    `;

    // Resend ile e-postayı gönder
    const { data, error } = await resend.emails.send({
      from: 'Alfabe Yol Haritası <noreply@updates.alfabe.co>',
      to: [to],
      subject: 'Fikir Doğrulama',
      html: htmlContent,
    });

    // Hata kontrolü
    if (error) {
      console.error('Resend API Hatası:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Başarılı yanıt
    return NextResponse.json({ success: true, id: data?.id });
    
  } catch (error: any) {
    console.error('Genel Sunucu Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}