import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  console.log('=== VERIFY API CALLED ===')
  console.log('Token:', token)

  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // 1. Pending'den al
    console.log('Fetching from pending_ideas...')
    const { data: pending, error: fetchError } = await supabase
      .from('pending_ideas')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Geçersiz link: ' + fetchError.message }, { status: 404 })
    }

    if (!pending) {
      console.error('No pending idea found with token:', token)
      return NextResponse.json({ error: 'Token bulunamadı' }, { status: 404 })
    }

    console.log('Pending idea found:', pending.id)

    // 2. Ideas'a ekle
    console.log('Inserting into ideas...')
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
    console.log('Deleting from pending_ideas...')
    const { error: deleteError } = await supabase
      .from('pending_ideas')
      .delete()
      .eq('id', pending.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
    }

    console.log('SUCCESS!')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Sunucu hatası: ' + String(error) }, { status: 500 })
  }
}