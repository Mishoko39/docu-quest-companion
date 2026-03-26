
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Enum for block types
CREATE TYPE public.block_type AS ENUM ('video', 'text', 'image', 'link', 'file', 'quiz');

-- Enum for content status
CREATE TYPE public.content_status AS ENUM ('draft', 'published');

-- Poles table
CREATE TABLE public.poles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- User roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- User poles junction
CREATE TABLE public.user_poles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pole_id UUID NOT NULL REFERENCES public.poles(id) ON DELETE CASCADE,
  UNIQUE (user_id, pole_id)
);

-- Spaces
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_general BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Space poles junction
CREATE TABLE public.space_poles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  pole_id UUID NOT NULL REFERENCES public.poles(id) ON DELETE CASCADE,
  UNIQUE (space_id, pole_id)
);

-- Modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lesson blocks
CREATE TABLE public.lesson_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_type block_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0
);

-- User progress
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user pole IDs
CREATE OR REPLACE FUNCTION public.get_user_pole_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pole_id FROM public.user_poles WHERE user_id = _user_id
$$;

-- Function to check if user has access to a space
CREATE OR REPLACE FUNCTION public.user_has_space_access(_user_id UUID, _space_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces s
    WHERE s.id = _space_id
    AND (
      s.is_general = true
      OR EXISTS (
        SELECT 1 FROM public.space_poles sp
        JOIN public.user_poles up ON sp.pole_id = up.pole_id
        WHERE sp.space_id = s.id AND up.user_id = _user_id
      )
    )
  )
$$;

-- RLS Policies

-- Poles: readable by all authenticated
CREATE POLICY "Poles readable by authenticated" ON public.poles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Poles manageable by admins" ON public.poles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User poles
CREATE POLICY "Users can view own poles" ON public.user_poles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all user poles" ON public.user_poles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage user poles" ON public.user_poles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Spaces: users see only spaces matching their poles or general
CREATE POLICY "Users can view accessible spaces" ON public.spaces
  FOR SELECT TO authenticated
  USING (
    is_general = true
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.space_poles sp
      WHERE sp.space_id = id
      AND sp.pole_id IN (SELECT public.get_user_pole_ids(auth.uid()))
    )
  );
CREATE POLICY "Admins can manage spaces" ON public.spaces
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Space poles
CREATE POLICY "Space poles readable" ON public.space_poles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage space poles" ON public.space_poles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Modules
CREATE POLICY "Users can view accessible modules" ON public.modules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.user_has_space_access(auth.uid(), space_id)
  );
CREATE POLICY "Admins can manage modules" ON public.modules
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lessons
CREATE POLICY "Users can view accessible lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = module_id
      AND public.user_has_space_access(auth.uid(), m.space_id)
    )
  );
CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lesson blocks
CREATE POLICY "Users can view accessible blocks" ON public.lesson_blocks
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON l.module_id = m.id
      WHERE l.id = lesson_id
      AND public.user_has_space_access(auth.uid(), m.space_id)
    )
  );
CREATE POLICY "Admins can manage blocks" ON public.lesson_blocks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User progress
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own progress" ON public.user_progress
  FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all progress" ON public.user_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default poles
INSERT INTO public.poles (name, slug) VALUES
  ('Coaching', 'coaching'),
  ('Administratif', 'administratif'),
  ('Direction', 'direction'),
  ('Sales', 'sales'),
  ('Marketing', 'marketing');
