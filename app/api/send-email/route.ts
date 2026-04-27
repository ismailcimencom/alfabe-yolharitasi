import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { to, token, title, description } = await request.json();
  
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://alfabe-yolharitasi.vercel.app';
  const verifyUrl = `${origin}/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Fikir Doğrulama</title>
    </head>
    <body style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #6366f1;">Alfabe Yol Haritası</h2>
      <h3>Fikir Doğrulama</h3>
      <p><strong>Başlık:</strong> ${title}</p>
      <p><strong>Açıklama:</strong> ${description}</p>
      <p>Fikrinizi onaylamak için aşağıdaki butona tıklayın:</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px;">Fikri Onayla</a>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">Bu e-posta Alfabe Yol Haritası tarafından otomatik gönderilmiştir.</p>
    </body>
    </html>
  `;

  try {
    const response = await fetch('https://edge.email/api/mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@alfabe-yolharitasi.vercel.app' },
        subject: 'Fikir Doğrulama',
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!response.ok) throw new Error('E-posta gönderilemedi');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}