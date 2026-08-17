-- ============================================================
-- EYE Workflow Hub — تعديل التكليف المنشور ليكون متاحاً للجنة HR كلها
-- وإرسال إشعار فوري لجميع أعضاء لجنة الـ HR
-- يُرجى تشغيل هذا الكود في: Supabase Dashboard > SQL Editor > New query
-- ============================================================

DO $$
DECLARE
  v_task record;
  v_member record;
BEGIN
  -- 1) تعديل جميع مهام لجنة الـ HR الحالية لتصبح موجهة لكافة أقسام لجنة الموارد البشرية (All)
  UPDATE public.tasks
  SET department = 'All',
      status = 'Published'
  WHERE committee = 'HR';

  -- 2) إرسال إشعار بالتكليف لكل أعضاء وقادة لجنة الـ HR
  FOR v_task IN 
    SELECT id, name, deadline, committee, department 
    FROM public.tasks 
    WHERE committee = 'HR' AND status = 'Published'
  LOOP
    FOR v_member IN 
      SELECT id, full_name 
      FROM public.profiles 
      WHERE (committee = 'HR' OR role IN ('Super Admin', 'Leader', 'Head', 'Member'))
        AND status = 'Active'
    LOOP
      -- التحقق من عدم وجود إشعار مسبق بنفس الـ related_id للمستخدم
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = v_member.id AND related_id = v_task.id::text
      ) THEN
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          is_read,
          created_at,
          related_id
        ) VALUES (
          v_member.id,
          '📋 تكليف جديد للجنة: ' || v_task.name,
          'تم تعميم ونشر تكليف جديد لكافة أقسام لجنة الموارد البشرية HR: "' || v_task.name || '". يرجى رفع الحل قبل انتهاء الموعد.',
          'success',
          false,
          now(),
          v_task.id::text
        );
      END IF;
    END LOOP;
  END LOOP;

END $$;

-- التحقق من المهام المحدثة للجنة HR
SELECT id, name, committee, department, priority, status, deadline 
FROM public.tasks 
WHERE committee = 'HR';

-- التحقق من الإشعارات المرسلة
SELECT n.id, p.full_name, p.email, n.title, n.message, n.created_at
FROM public.notifications n
JOIN public.profiles p ON p.id = n.user_id
WHERE n.title LIKE '%تكليف جديد للجنة%'
ORDER BY n.created_at DESC
LIMIT 20;
