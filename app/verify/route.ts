import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  
  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
  }

  // 1. Pending ideas'dan token ile veriyi al
  const { data: pending, error: fetchError } = await supabaseAdmin
    .from('pending_ideas')
    .select('*')
    .eq('token', token)
    .single()

  if (fetchError || !pending) {
    return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş link' }, { status: 404 })
  }

  // 2. Ideas tablosuna ekle
  const { error: insertError } = await supabaseAdmin
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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 3. Pending ideas'dan sil
  await supabaseAdmin
    .from('pending_ideas')
    .delete()
    .eq('id', pending.id)

  return NextResponse.json({ success: true })
}