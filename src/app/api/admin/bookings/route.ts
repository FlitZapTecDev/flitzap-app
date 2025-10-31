import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client (service role key)
const admin = createClient(supabaseUrl, serviceKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const asCsv = searchParams.get('csv') === '1';

    const { data, error } = await admin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]);
    }

    if (asCsv) {
      const headers = [
        'reference','service','date','time','status',
        'customer_name','customer_email','customer_phone','customer_address','notes','created_at',
      ];
      const rows = data.map((b: any) => [
        b.reference, b.service, b.date, b.time, b.status,
        b.customer_name, b.customer_email, b.customer_phone, b.customer_address,
        (b.notes ?? '').toString().replace(/\r?\n/g, ' ').replace(/,/g, ';'),
        b.created_at,
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="flitzap-bookings.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
