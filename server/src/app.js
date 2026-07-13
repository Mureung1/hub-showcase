import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase, isMock, mockDb } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    databaseMode: isMock ? 'mock-in-memory' : 'supabase-cloud'
  });
});

// GET /api/posts - Fetch all feed posts (Supports sorting and fallbacks)
app.get('/api/posts', async (req, res) => {
  if (isMock) {
    // Sort by created_at desc by default
    const sorted = [...mockDb.posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json(sorted);
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts - Create a new post
app.post('/api/posts', async (req, res) => {
  const { title, content, tags, reward, author_grade, author_major } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const newPost = {
    title,
    content,
    tags: tags || [],
    reward: reward || '없음',
    author_grade: author_grade || '1학년',
    author_major: author_major || '일반학과',
    created_at: new Date().toISOString()
  };

  if (isMock) {
    const created = { id: String(mockDb.posts.length + 1), ...newPost };
    mockDb.posts.push(created);
    return res.status(201).json(created);
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([newPost])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Database mode: ${isMock ? 'Mock DB (In-memory)' : 'Supabase Cloud'}`);
});
