import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
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

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`🔗 A user connected: ${socket.id}`);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`🚪 User ${socket.id} joined room: ${roomId}`);
  });

  socket.on('sendMessage', async (data) => {
    const dbMsg = {
      id: data.message.id.toString(),
      room_id: data.roomId,
      sender: data.message.sender,
      text: data.message.text,
      time: data.message.time,
      created_at: new Date().toISOString()
    };
    
    if (isMock) {
      mockDb.messages.push(dbMsg);
      const chat = mockDb.chats.find(c => c.id === data.roomId);
      if (chat) {
        chat.last_message = dbMsg.text;
        chat.last_time = dbMsg.time;
      }
    } else {
      try {
        await supabase.from('messages').insert([dbMsg]);
        await supabase.from('chats').update({ last_message: dbMsg.text, last_time: dbMsg.time }).eq('id', data.roomId);
      } catch (e) {
        console.error("DB Save Error:", e.message);
      }
    }

    socket.to(data.roomId).emit('receiveMessage', data.message);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

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
  const { status, reward, category } = req.query;

  if (isMock) {
    let filtered = [...mockDb.posts];
    
    if (status === 'recruiting') {
      filtered = filtered.filter(p => p.status === 'recruiting' || p.status === '모집중');
    } else if (status === 'completed') {
      filtered = filtered.filter(p => p.status === 'completed' || p.status === '모집완료');
    }
    
    if (reward) {
      filtered = filtered.filter(p => p.reward === reward);
    }
    
    if (category && category !== '전체') {
      filtered = filtered.filter(p => (p.tags && p.tags.includes(category)) || p.major_tag === category);
    }

    // Sort by created_at desc by default
    const sorted = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json(sorted);
  }

  try {
    let query = supabase.from('posts').select('*');

    if (status === 'recruiting') {
      query = query.eq('status', '모집중'); // adjust depending on DB values
    } else if (status === 'completed') {
      query = query.eq('status', '모집완료');
    }
    
    if (reward) {
      query = query.eq('reward', reward);
    }
    
    if (category && category !== '전체') {
      // Assuming 'tags' is a jsonb or array column in Supabase
      query = query.contains('tags', [category]); 
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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

// GET /api/chats - Fetch chat rooms
app.get('/api/chats', async (req, res) => {
  if (isMock) {
    return res.json(mockDb.chats);
  }
  try {
    const { data, error } = await supabase.from('chats').select('*').order('last_time', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats - Create a chat room
app.post('/api/chats', async (req, res) => {
  const { id, postId, postTitle, partnerName, partnerGrade, lastMessage, lastTime, initialMsgs } = req.body;
  
  const newChat = {
    id, post_id: postId, post_title: postTitle, partner_name: partnerName, 
    partner_grade: partnerGrade, last_message: lastMessage, last_time: lastTime, created_at: new Date().toISOString()
  };

  if (isMock) {
    mockDb.chats.push(newChat);
    if (initialMsgs) {
      initialMsgs.forEach(m => mockDb.messages.push({
        id: m.id.toString(), room_id: id, sender: m.sender, text: m.text, time: m.time, created_at: new Date().toISOString()
      }));
    }
    return res.status(201).json(newChat);
  }

  try {
    const { data, error } = await supabase.from('chats').insert([newChat]).select();
    if (error) throw error;

    if (initialMsgs && initialMsgs.length > 0) {
      const msgsToInsert = initialMsgs.map(m => ({
        id: m.id.toString(), room_id: id, sender: m.sender, text: m.text, time: m.time, created_at: new Date().toISOString()
      }));
      await supabase.from('messages').insert(msgsToInsert);
    }

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/:roomId/messages - Fetch messages for a room
app.get('/api/chats/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  if (isMock) {
    const msgs = mockDb.messages.filter(m => m.room_id === roomId);
    return res.json(msgs);
  }
  try {
    const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Database mode: ${isMock ? 'Mock DB (In-memory)' : 'Supabase Cloud'}`);
});
