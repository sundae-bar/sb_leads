/**
 * Create an admin user in the local Supabase instance.
 *
 * Usage:
 *   pnpm create-admin <email> <password>
 *   pnpm create-admin admin@example.com mypassword123
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: pnpm create-admin <email> <password>');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('Failed to create user:', error.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', data.user.id);

  if (profileError) {
    console.error('User created but failed to set admin role:', profileError.message);
    process.exit(1);
  }

  console.log('Admin user created:');
  console.log(`  id:    ${data.user.id}`);
  console.log(`  email: ${data.user.email}`);
  console.log(`  role:  admin`);
}

main();
