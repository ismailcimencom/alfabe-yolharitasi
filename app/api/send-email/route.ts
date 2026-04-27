import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { to, token, title, description } = await request.json();
  
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://alfabe-yolharitasi.vercel.app';
  const verifyUrl = `${origin}/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: 'Alfabe Yol Haritası <noreply@updates.alfabe.co>',
      to: [to],
      subject: 'Fikir Doğrulama',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Fikir Doğrulama</h2>
          <p><strong>Başlık:</strong> ${title}</p>
          <p><strong>Açıklama:</strong> ${description}</p>
          <p>Fikrinizi onaylamak için aşağıdaki butona tıklayın:</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px;">Fikri Onayla</a>
          <p>veya linke tıklayın: <a href="${verifyUrl}">${verifyUrl}</a></p>
          <hr />
          <p style="color: #666; font-size: 12px;">Alfabe Yol Haritası</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}