-- ============================================================
-- EYE Workflow Hub — إضافة حساب العضو: زينب أحمد
-- يُرجى تشغيل هذا الكود في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'zainab151997662006@gmail.com';
  v_password text := '664615';
  v_full_name text := 'زينب احمد';
  v_phone text := '01227322198';
  v_role text := 'Member';
  v_status text := 'Active';
  v_committee text := 'HR';
  v_department text := 'HRM';
  v_sub_committee text := 'HR OF PR';
  v_governorate text := 'الغربية';
  v_membership_code text;
  v_count int;
BEGIN
  -- 1) إذا كان الحساب موجوداً مسبقاً في auth.users نأخذ الـ ID القديم أو ننشئ جديداً
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- إنشاء مستخدم التوثيق في auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', v_full_name, 'role', v_role),
      now(), now(), '', '', '', ''
    );

    -- إنشاء الهوية في auth.identities
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_email,
      jsonb_build_object('sub', v_user_id, 'email', v_email, 'email_verified', true),
      'email',
      now(), now(), now()
    );
  ELSE
    -- تحديث كلمة المرور في حال كان مسجلاً من قبل
    UPDATE auth.users
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_build_object('full_name', v_full_name, 'role', v_role),
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 2) إنشاء كود العضوية تلقائياً
  SELECT count(*) INTO v_count FROM public.profiles;
  v_membership_code := 'EYE-HR-M' || lpad((v_count + 1)::text, 4, '0');

  -- 3) إدخال أو تحديث البيانات في public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone_number,
    role,
    status,
    committee,
    department,
    sub_committee,
    governorate,
    membership_code,
    joined_date,
    avatar_url,
    bio
  ) VALUES (
    v_user_id,
    v_full_name,
    v_email,
    v_phone,
    v_role,
    v_status,
    v_committee,
    v_department,
    v_sub_committee,
    v_governorate,
    v_membership_code,
    current_date,
    'https://api.dicebear.com/7.x/initials/svg?seed=' || encode(convert_to(v_full_name, 'UTF8'), 'hex') || '&backgroundColor=0b59b1',
    'عضو في لجنة الموارد البشرية (HRM) — كيان المصريون الشباب EYE'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone_number = EXCLUDED.phone_number,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    committee = EXCLUDED.committee,
    department = EXCLUDED.department,
    sub_committee = EXCLUDED.sub_committee,
    governorate = EXCLUDED.governorate,
    avatar_url = EXCLUDED.avatar_url;

END $$;

-- التحقق من إضافة المستخدم
SELECT id, full_name, email, phone_number, role, status, committee, department, sub_committee, governorate, membership_code 
FROM public.profiles 
WHERE email = 'zainab151997662006@gmail.com';
