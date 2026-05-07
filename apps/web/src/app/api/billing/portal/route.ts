import { NextResponse } from 'next/server';
import { getAuthProvider } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/billing/stripe';

export async function POST() {
  const user = await getAuthProvider().getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.tenantRole === 'member') {
    return NextResponse.json({ error: 'Only owners and admins can manage billing' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  const webUrl = process.env.WEB_URL ?? 'http://localhost:3002';
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${webUrl}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
