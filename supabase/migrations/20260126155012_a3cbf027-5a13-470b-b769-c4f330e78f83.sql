-- Alterar o enum para incluir superadmin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';