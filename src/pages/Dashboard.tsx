/**
 * Dashboard Page - Main routing for citizen and responder modes
 * 
 * Handles mode detection from URL params and loads appropriate view
 * Mobile-first: Full viewport with no scrolling, responsive layouts
 * Real-time: Syncs with Supabase for live updates
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResQStore } from '@/store/useResQStore';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { DbSmokeTest } from '@/components/dev/DbSmokeTest';
import CitizenView from '@/components/dashboard/CitizenView';
import ResponderView from '@/components/dashboard/ResponderView';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') as 'citizen' | 'responder' || 'citizen';
  
  const { setUserMode } = useResQStore();

  // Initialize real-time sync with Supabase
  useRealtimeSync();

  // Set user mode from URL
  useEffect(() => {
    setUserMode(mode);
  }, [mode, setUserMode]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-white dark:bg-[#1a1a1a] safe-area-inset">
      {/* DEV ONLY: Database smoke test */}
      {import.meta.env.DEV && <DbSmokeTest />}
      
      {mode === 'citizen' ? <CitizenView /> : <ResponderView />}
    </div>
  );
}
