import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 1. Pending'den al
  const { data: pending, error: fetchError } = await supabase
    .from('pending_ideas')
    .select('*')
    .eq('token', token)
    .single()

  if (fetchError || !pending) {
    return NextResponse.json({ error: 'Geçersiz link' }, { status: 404 })
  }

  // 2. Ideas'a ekle (ZORUNLU)
  const { error: insertError } = await supabase
    .from('ideas')
    .insert({
      title: pending.title,
      description: pending.description,
      email: pending.email,
      email_verified: true,
      status: 'planlanan',
      is_published: false
    })

  if (insertError) {
    console.error('Insert error:', insertError)
    return NextResponse.json({ error: 'Ekleme hatası: ' + insertError.message }, { status: 500 })
  }

  // 3. Pending'den sil
  await supabase
    .from('pending_ideas')
    .delete()
    .eq('id', pending.id)

  return NextResponse.json({ success: true })
}