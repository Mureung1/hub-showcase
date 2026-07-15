-- PostgreSQL DDL Script for Supabase (GNU Course AI Navigator)
-- Table definitions for Users, Courses, Timetables, and Grades

-- 1. Users Table (Extension of Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Allow individual insert/update" ON public.users
    FOR ALL USING (auth.uid() = id);


-- 2. Courses Master Table (개설 과목 정보)
CREATE TABLE IF NOT EXISTS public.courses (
    course_id TEXT PRIMARY KEY, -- e.g., 'CSE301'
    subject_name TEXT NOT NULL,
    professor TEXT NOT NULL,
    credit INTEGER NOT NULL CHECK (credit > 0),
    time_slots JSONB NOT NULL, -- e.g., [{"day": 1, "start": 9, "end": 11}]
    department TEXT NOT NULL, -- e.g., '컴퓨터공학과'
    category TEXT NOT NULL -- e.g., 'major-req', 'major-opt', 'converge-edu'
);

-- Index for faster course searches
CREATE INDEX IF NOT EXISTS idx_courses_subject_name ON public.courses(subject_name);
CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department);


-- 3. User Timetables Table (사용자 시간표 저장)
CREATE TABLE IF NOT EXISTS public.user_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    semester TEXT NOT NULL, -- e.g., '2026-2'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, course_id, semester) -- Prevent double booking/saving same course in same semester
);

CREATE INDEX IF NOT EXISTS idx_user_timetables_user_semester ON public.user_timetables(user_id, semester);


-- 4. User Grades Table (사용자 과거 취득 성적)
CREATE TABLE IF NOT EXISTS public.user_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    credit INTEGER NOT NULL,
    grade_point TEXT NOT NULL, -- e.g., 'A+', 'B0', 'C+', 'D0', 'F'
    semester TEXT NOT NULL, -- e.g., '2025-1'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_grades_user ON public.user_grades(user_id);

-- Enable RLS and create policies for User Timetables & Grades
ALTER TABLE public.user_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read/write their own timetables" ON public.user_timetables
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only read/write their own grades" ON public.user_grades
    FOR ALL USING (auth.uid() = user_id);
