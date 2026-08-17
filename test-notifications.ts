/**
 * Test script to verify Supabase notification and task functionality
 * Run with: npx ts-node test-notifications.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uvckrjskcxpxphywrqdn.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.error('❌ ERROR: VITE_SUPABASE_ANON_KEY not found in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkNotifications() {
  console.log('\n🔍 Checking notifications table...\n');

  try {
    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching notifications:', error.message);
      return null;
    }

    console.log(`📊 Total notifications: ${count}`);
    if (data && data.length > 0) {
      console.log(`📋 Latest ${data.length} notification(s):\n`);
      data.forEach((n: any, idx: number) => {
        console.log(`${idx + 1}. ID: ${n.id}`);
        console.log(`   User ID: ${n.user_id}`);
        console.log(`   Title: ${n.title}`);
        console.log(`   Message: ${n.message}`);
        console.log(`   Type: ${n.type}`);
        console.log(`   Created: ${n.created_at}`);
        console.log(`   Related ID: ${n.related_id}`);
        console.log('   ---');
      });
    } else {
      console.log('ℹ️ No notifications found');
    }

    return data;
  } catch (err) {
    console.error('❌ Exception fetching notifications:', err);
    return null;
  }
}

async function checkTasks() {
  console.log('\n🔍 Checking tasks table...\n');

  try {
    const { data, error, count } = await supabase
      .from('tasks')
      .select('id, name, governorate, committee, department, created_at, status, created_by', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching tasks:', error.message);
      return null;
    }

    console.log(`📊 Total tasks: ${count}`);
    if (data && data.length > 0) {
      console.log(`📋 Latest ${data.length} task(s):\n`);
      data.forEach((t: any, idx: number) => {
        console.log(`${idx + 1}. ID: ${t.id.substring(0, 8)}...`);
        console.log(`   Name: ${t.name}`);
        console.log(`   Governorates: ${t.governorate || 'Not set'}`);
        console.log(`   Committee: ${t.committee}`);
        console.log(`   Department: ${t.department}`);
        console.log(`   Status: ${t.status}`);
        console.log(`   Created: ${t.created_at}`);
        console.log('   ---');
      });
    } else {
      console.log('ℹ️ No tasks found');
    }

    return data;
  } catch (err) {
    console.error('❌ Exception fetching tasks:', err);
    return null;
  }
}

async function checkProfiles() {
  console.log('\n🔍 Checking profiles (users) table...\n');

  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('id, fullName, governorate, status, role, committee', { count: 'exact' })
      .eq('status', 'Active')
      .order('governorate')
      .limit(15);

    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return null;
    }

    console.log(`📊 Active profiles: ${count}`);
    if (data && data.length > 0) {
      console.log(`📋 Sample users:\n`);
      data.forEach((p: any, idx: number) => {
        console.log(`${idx + 1}. ${p.fullName} (${p.role})`);
        console.log(`   Governate: ${p.governorate || 'Not set'}`);
        console.log(`   Committee: ${p.committee}`);
        console.log('   ---');
      });
    } else {
      console.log('ℹ️ No profiles found');
    }

    return data;
  } catch (err) {
    console.error('❌ Exception fetching profiles:', err);
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('   Supabase Verification Test Script   ');
  console.log('========================================');

  // Test connection
  try {
    const { data: testCheck, error: testErr } = await supabase.from('notifications').select('id').limit(1);
    if (testErr) throw testErr;
    console.log('✅ Supabase connection successful!\n');
  } catch (err) {
    console.error('❌ Supabase connection failed:', (err as Error).message);
    process.exit(1);
  }

  // Check notifications
  await checkNotifications();

  // Check tasks
  await checkTasks();

  // Check profiles/users
  await checkProfiles();

  console.log('\n========================================');
  console.log('   Test Complete!   ');
  console.log('========================================\n');
}

main().catch(console.error);