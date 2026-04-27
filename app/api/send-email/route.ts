import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  const { to, token, title, description } = await request.json();
  
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${origin}/verify?token=${token}`;

  // Mail gönderimi için test hesabı oluştur (ethereal.email)
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transporter.sendMail({
    from: '"Alfabe Yol Haritası" <noreply@alfabe-yolharitasi.vercel.app>',
    to: to,
    subject: 'Fikir Doğrulama',
    html: `
      <h2>Fikir Doğrulama</h2>
      <p><strong>Başlık:</strong> ${title}</p>
      <p><strong>Açıklama:</strong> ${description}</p>
      <a href="${verifyUrl}">Fikri Onayla</a>
    `,
  });

  // Test e-postasını görüntülemek için (development)
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

  return NextResponse.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info) });
}