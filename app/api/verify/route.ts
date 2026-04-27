import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('pending_ideas')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !pending) {
      return NextResponse.json({ error: 'Geçersiz link' }, { status: 404 })
    }

    await supabaseAdmin
      .from('ideas')
      .insert({
        title: pending.title,
        description: pending.description,
        email: pending.email,
        email_verified: true,
        status: 'planlanan',
        is_published: false
      })

    await supabaseAdmin
      .from('pending_ideas')
      .delete()
      .eq('id', pending.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}