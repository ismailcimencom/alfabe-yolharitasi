import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
  }

  // 🔐 Service role ile admin yetkisi alıyoruz (tüm kısıtlamaları kaldırır)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )

  try {
    // 1️⃣ Doğrulama bekleyen fikri bul
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('pending_ideas')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !pending) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Geçersiz link' }, { status: 404 })
    }

    // 2️⃣ Fikri ana tabloya ekle (is_published = false, yani sitede görünmez)
    const { error: insertError } = await supabaseAdmin
      .from('ideas')
      .insert({
        title: pending.title,
        description: pending.description,
        email: pending.email,
        email_verified: true,
        status: 'planlanan',
        is_published: false,
        net_votes: 0,
        view_count: 0
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ 
        error: `Ekleme hatası: ${insertError.message}` 
      }, { status: 500 })
    }

    // 3️⃣ Doğrulama bekleyen listeden kaldır
    await supabaseAdmin
      .from('pending_ideas')
      .delete()
      .eq('id', pending.id)

    console.log('✅ Fikir başarıyla eklendi:', pending.title)
    return NextResponse.json({ success: true })
    
  } catch (err) {
    console.error('Beklenmeyen hata:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}