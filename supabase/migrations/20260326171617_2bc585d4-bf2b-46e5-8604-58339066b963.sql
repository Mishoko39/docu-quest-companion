
-- Function to notify users when a module is added to a space
CREATE OR REPLACE FUNCTION public.notify_on_module_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  space_record RECORD;
  user_record RECORD;
BEGIN
  -- Get the space info
  SELECT id, title, is_general INTO space_record
  FROM public.spaces WHERE id = NEW.space_id;

  IF space_record IS NULL THEN
    RETURN NEW;
  END IF;

  IF space_record.is_general THEN
    -- Notify all active users
    FOR user_record IN
      SELECT user_id FROM public.profiles WHERE is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (
        user_record.user_id,
        'Nouveau module disponible',
        'Le module "' || NEW.title || '" a été ajouté dans "' || space_record.title || '".',
        '/spaces/' || space_record.id
      );
    END LOOP;
  ELSE
    -- Notify users who have a pole matching the space
    FOR user_record IN
      SELECT DISTINCT up.user_id
      FROM public.user_poles up
      JOIN public.space_poles sp ON sp.pole_id = up.pole_id
      JOIN public.profiles p ON p.user_id = up.user_id AND p.is_active = true
      WHERE sp.space_id = space_record.id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (
        user_record.user_id,
        'Nouveau module disponible',
        'Le module "' || NEW.title || '" a été ajouté dans "' || space_record.title || '".',
        '/spaces/' || space_record.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to notify users when a lesson is added
CREATE OR REPLACE FUNCTION public.notify_on_lesson_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  module_record RECORD;
  space_record RECORD;
  user_record RECORD;
BEGIN
  -- Get module and space info
  SELECT id, title, space_id INTO module_record
  FROM public.modules WHERE id = NEW.module_id;

  IF module_record IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, title, is_general INTO space_record
  FROM public.spaces WHERE id = module_record.space_id;

  IF space_record IS NULL THEN
    RETURN NEW;
  END IF;

  IF space_record.is_general THEN
    FOR user_record IN
      SELECT user_id FROM public.profiles WHERE is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (
        user_record.user_id,
        'Nouvelle leçon disponible',
        'La leçon "' || NEW.title || '" a été ajoutée dans "' || module_record.title || '".',
        '/lessons/' || NEW.id
      );
    END LOOP;
  ELSE
    FOR user_record IN
      SELECT DISTINCT up.user_id
      FROM public.user_poles up
      JOIN public.space_poles sp ON sp.pole_id = up.pole_id
      JOIN public.profiles p ON p.user_id = up.user_id AND p.is_active = true
      WHERE sp.space_id = space_record.id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (
        user_record.user_id,
        'Nouvelle leçon disponible',
        'La leçon "' || NEW.title || '" a été ajoutée dans "' || module_record.title || '".',
        '/lessons/' || NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_module_insert
  AFTER INSERT ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_module_insert();

CREATE TRIGGER on_lesson_insert
  AFTER INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_lesson_insert();
