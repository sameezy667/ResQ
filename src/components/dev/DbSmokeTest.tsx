/**
 * Database Smoke Test Component (DEV ONLY)
 * 
 * Verifies Supabase connection and data flow on mount.
 * Use this during development to quickly check:
 * - Database connectivity
 * - Real-time subscriptions
 * - Data loading from store
 * 
 * DO NOT include in production build.
 * 
 * @module components/dev/DbSmokeTest
 */

import { useEffect } from 'react';
import { useResQStore } from '@/store/useResQStore';
import { supabase } from '@/lib/supabase';

export function DbSmokeTest() {
  const { incidents, units } = useResQStore();

  useEffect(() => {
    const runSmokeTest = async () => {
      console.log('═══════════════════════════════════════════');
      console.log('🧪 ResQ Database Smoke Test');
      console.log('═══════════════════════════════════════════');

      // Test 1: Supabase client initialization
      console.log('\n1️⃣ Supabase Client:');
      console.log('   URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('   Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

      // Test 2: Auth session
      console.log('\n2️⃣ Auth Session:');
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log('   ✅ User authenticated:', sessionData.session.user.email);
      } else {
        console.log('   ⚠️  No active session (anonymous access)');
      }

      // Test 3: Raw incidents query
      console.log('\n3️⃣ Raw Incidents Query:');
      try {
        const { data: rawIncidents, error } = await supabase
          .from('incidents')
          .select('id, type, status, severity, verification_count, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) {
          console.error('   ❌ Query failed:', error.message);
        } else {
          console.log('   ✅ Query successful');
          console.log('   📊 Total incidents:', rawIncidents?.length || 0);
          if (rawIncidents && rawIncidents.length > 0) {
            const sample = rawIncidents[0] as any;
            console.log('   📝 Sample incident:', {
              id: sample.id,
              type: sample.type,
              status: sample.status,
              severity: sample.severity,
              verification_count: sample.verification_count,
            });
          } else {
            console.log('   ℹ️  No incidents in database yet');
          }
        }
      } catch (err) {
        console.error('   ❌ Exception:', err);
      }

      // Test 4: Raw units query
      console.log('\n4️⃣ Raw Units Query:');
      try {
        const { data: rawUnits, error } = await supabase
          .from('units')
          .select('id, label, type, is_available')
          .limit(3);

        if (error) {
          console.error('   ❌ Query failed:', error.message);
        } else {
          console.log('   ✅ Query successful');
          console.log('   🚑 Total units:', rawUnits?.length || 0);
          if (rawUnits && rawUnits.length > 0) {
            const sample = rawUnits[0] as any;
            console.log('   📝 Sample unit:', {
              id: sample.id,
              label: sample.label,
              type: sample.type,
              is_available: sample.is_available,
            });
          } else {
            console.log('   ℹ️  No units in database yet');
          }
        }
      } catch (err) {
        console.error('   ❌ Exception:', err);
      }

      // Test 5: Store data
      console.log('\n5️⃣ Zustand Store Data:');
      console.log('   📊 Incidents in store:', incidents.length);
      console.log('   🚑 Units in store:', units.length);
      if (incidents.length > 0) {
        console.log('   📝 First incident:', {
          id: incidents[0].id,
          type: incidents[0].type,
          status: incidents[0].status,
          verificationCount: incidents[0].verificationCount,
        });
      }

      // Test 6: Real-time channel status
      console.log('\n6️⃣ Real-time Channels:');
      const channels = supabase.getChannels();
      console.log('   📡 Active channels:', channels.length);
      channels.forEach((ch, idx) => {
        console.log(`   ${idx + 1}. ${ch.topic} - ${ch.state}`);
      });

      // Test 7: RPC function test
      console.log('\n7️⃣ RPC Function Test:');
      try {
        const { data, error } = await supabase.rpc('get_nearby_units', {
          p_lat: 40.7589,
          p_lng: -73.9851,
          p_type: null,
          p_radius_km: 50,
        });

        if (error) {
          console.error('   ❌ RPC failed:', error.message);
        } else {
          console.log('   ✅ RPC successful');
          console.log('   🚑 Nearby units found:', data?.length || 0);
        }
      } catch (err) {
        console.error('   ❌ Exception:', err);
      }

      console.log('\n═══════════════════════════════════════════');
      console.log('✅ Smoke Test Complete');
      console.log('═══════════════════════════════════════════\n');
    };

    // Run after a small delay to let store initialize
    const timer = setTimeout(runSmokeTest, 2000);
    return () => clearTimeout(timer);
  }, [incidents.length, units.length]);

  // This component renders nothing
  return null;
}
