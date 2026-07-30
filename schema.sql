-- PostgreSQL DDL Script for Supabase (GNU Course AI Navigator)
-- Table definitions for Users, Profiles, Chat Messages, Courses, Timetables, and Grades

-- 1. Users Table (Extension of Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Allow individual insert/update" ON public.users
    FOR ALL USING (auth.uid() = id);


-- 2. Profiles Table (학생 상세 정보)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '김경상',
    student_type TEXT NOT NULL DEFAULT 'transfer', -- e.g., 'transfer', 'general', 'double-major'
    department TEXT NOT NULL DEFAULT '컴퓨터공학과',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual profile access" ON public.profiles
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);


-- 3. Chat Messages Table (AI 학업 어드바이저 대화 내역)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual chat messages access" ON public.chat_messages
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);


-- 4. Courses Master Table (개설 과목 정보)
CREATE TABLE IF NOT EXISTS public.courses (
    course_id TEXT PRIMARY KEY, -- e.g., 'CSE301'
    subject_name TEXT NOT NULL,
    professor TEXT NOT NULL,
    credit INTEGER NOT NULL CHECK (credit > 0),
    time_slots JSONB NOT NULL, -- e.g., [{"day": 1, "start": 9, "end": 11}]
    department TEXT NOT NULL, -- e.g., '컴퓨터공학과'
    category TEXT NOT NULL -- e.g., 'major-req', 'major-opt', 'converge-edu'
);

CREATE INDEX IF NOT EXISTS idx_courses_subject_name ON public.courses(subject_name);
CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department);


-- 5. User Timetables Table (사용자 시간표 저장)
CREATE TABLE IF NOT EXISTS public.user_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    semester TEXT NOT NULL, -- e.g., '2026-2'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, course_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_user_timetables_user_semester ON public.user_timetables(user_id, semester);


-- 6. User Grades Table (사용자 과거 취득 성적)
CREATE TABLE IF NOT EXISTS public.user_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    credit NUMERIC(3, 1) NOT NULL,
    grade_point TEXT NOT NULL, -- e.g., 'A+', 'B0', 'C+', 'D0', 'F', 'P'
    semester TEXT NOT NULL DEFAULT '2026-1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_grades_user ON public.user_grades(user_id);

ALTER TABLE public.user_timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read/write their own timetables" ON public.user_timetables
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read/write their own grades" ON public.user_grades
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);
