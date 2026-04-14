
CREATE OR REPLACE FUNCTION public.redeem_roulette_qr(p_qr_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_spin RECORD;
  v_profile RECORD;
  v_mission_id uuid;
  v_prev_points integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- 1. Look up the spin (single source of truth for prize value)
  SELECT id, email, prize_value, prize_label, status, qr_id
  INTO v_spin
  FROM public.roulette_spins
  WHERE qr_id = p_qr_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'qr_not_found');
  END IF;

  -- 2. Check if already redeemed
  IF v_spin.status = 'redeemed' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_redeemed');
  END IF;

  -- 3. Validate email matches user profile
  SELECT p.email, p.points INTO v_profile
  FROM public.profiles AS p
  WHERE p.user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;

  IF lower(v_profile.email) != lower(v_spin.email) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'email_mismatch');
  END IF;

  v_prev_points := v_profile.points;

  -- 4. Check if already redeemed in golden_pass_redemptions
  IF EXISTS (SELECT 1 FROM public.golden_pass_redemptions WHERE qr_id = p_qr_id::text) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_redeemed');
  END IF;

  -- 5. Mark spin as redeemed
  UPDATE public.roulette_spins
  SET status = 'redeemed', redeemed_at = now(), redeemed_by = v_user_id
  WHERE id = v_spin.id;

  -- 6. Insert golden_pass_redemptions
  INSERT INTO public.golden_pass_redemptions (qr_id, user_id, email, value, prize)
  VALUES (p_qr_id::text, v_user_id, v_profile.email, v_spin.prize_value, v_spin.prize_label);

  -- 7. Get golden-pass mission ID
  SELECT m.id INTO v_mission_id
  FROM public.missions AS m
  WHERE m.slug = 'golden-pass' AND m.is_active = true;

  -- 8. Complete mission (if exists and not already done)
  IF v_mission_id IS NOT NULL THEN
    INSERT INTO public.user_missions (user_id, mission_id, status)
    VALUES (v_user_id, v_mission_id, 'completed')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 9. Add SPIN value (not mission value) to profile
  UPDATE public.profiles AS p
  SET points = p.points + v_spin.prize_value,
      last_points_at = now(),
      updated_at = now()
  WHERE p.user_id = v_user_id;

  -- 10. Audit log
  INSERT INTO public.points_audit_log (user_id, origin, previous_points, points_added, new_points, mission_id, notes)
  VALUES (v_user_id, 'roulette', v_prev_points, v_spin.prize_value, v_prev_points + v_spin.prize_value, v_mission_id,
          'QR: ' || p_qr_id::text || ' | Prize: ' || v_spin.prize_label || ' | Value: ' || v_spin.prize_value);

  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_spin.prize_value,
    'new_total', v_prev_points + v_spin.prize_value,
    'prize_label', v_spin.prize_label
  );
END;
$function$;
