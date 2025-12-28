-- Row Level Security (RLS) Policies
-- Ensures data access is controlled by user roles and ownership

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin/dispatcher
CREATE OR REPLACE FUNCTION is_privileged_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'dispatcher');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to view other profiles (limited fields in app layer)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Only admins can insert/delete profiles (signup handled by trigger)
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- INCIDENTS POLICIES
-- ============================================

-- Anyone can view incidents (public safety data)
CREATE POLICY "Anyone can view incidents"
  ON public.incidents FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can create incidents
CREATE POLICY "Authenticated users can create incidents"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- Incident reporters can update their own unverified incidents
CREATE POLICY "Users can update own unverified incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (auth.uid() = reported_by AND is_verified = false);

-- Dispatchers/admins can update any incident
CREATE POLICY "Privileged users can update all incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (is_privileged_user());

-- Admins can delete incidents
CREATE POLICY "Admins can delete incidents"
  ON public.incidents FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- UNITS POLICIES
-- ============================================

-- Anyone can view units (needed for dispatch UI)
CREATE POLICY "Anyone can view units"
  ON public.units FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can create/update/delete units
CREATE POLICY "Admins can manage units"
  ON public.units FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin');

-- Service role (Edge Functions) can update unit status
-- This is handled by service role key, not RLS

-- ============================================
-- DISPATCHES POLICIES
-- ============================================

-- Authenticated users can view dispatches
CREATE POLICY "Users can view dispatches"
  ON public.dispatches FOR SELECT
  TO authenticated
  USING (true);

-- Only dispatchers/admins can create dispatches
CREATE POLICY "Privileged users can create dispatches"
  ON public.dispatches FOR INSERT
  TO authenticated
  WITH CHECK (is_privileged_user());

-- Only dispatchers/admins can update dispatches
CREATE POLICY "Privileged users can update dispatches"
  ON public.dispatches FOR UPDATE
  TO authenticated
  USING (is_privileged_user());

-- Admins can delete dispatches
CREATE POLICY "Admins can delete dispatches"
  ON public.dispatches FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- ATTACHMENTS POLICIES
-- ============================================

-- Users can view attachments for incidents they can see
CREATE POLICY "Users can view attachments"
  ON public.attachments FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can upload attachments to incidents they reported
CREATE POLICY "Users can upload attachments to own incidents"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incidents
      WHERE id = incident_id
      AND (reported_by = auth.uid() OR is_privileged_user())
    )
  );

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON public.attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Admins can delete any attachment
CREATE POLICY "Admins can delete any attachment"
  ON public.attachments FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Audit logs are insert-only (via triggers/functions)
-- No UPDATE or DELETE policies
