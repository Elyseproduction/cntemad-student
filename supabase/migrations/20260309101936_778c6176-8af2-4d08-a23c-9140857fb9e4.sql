
CREATE OR REPLACE FUNCTION public.admin_update_profile_badge(
  target_user_id uuid,
  new_is_admin_badge boolean DEFAULT NULL,
  new_is_developer boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Check if the caller has admin badge
  SELECT is_admin_badge INTO caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(caller_is_admin, false) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update the target profile
  UPDATE public.profiles
  SET
    is_admin_badge = COALESCE(new_is_admin_badge, profiles.is_admin_badge),
    is_developer = COALESCE(new_is_developer, profiles.is_developer)
  WHERE id = target_user_id;

  RETURN true;
END;
$$;
