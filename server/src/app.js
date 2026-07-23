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
    const isRead = data.message.is_read || false;
    const dbMsg = {
      id: data.message.id.toString(),
      room_id: data.roomId,
      sender: data.message.sender,
      text: data.message.text,
      time: data.message.time,
      is_read: isRead,
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

    socket.to(data.roomId).emit('receiveMessage', { ...data.message, is_read: isRead });
  });

  // 읽음 처리 이벤트
  socket.on('markAsRead', async ({ roomId, userRole }) => {
    if (isMock) {
      mockDb.messages.forEach(m => {
        if (String(m.room_id) === String(roomId) && m.sender !== userRole) {
          m.is_read = true;
        }
      });
    } else {
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('room_id', String(roomId))
          .neq('sender', userRole);
      } catch (e) {
        console.error("DB MarkAsRead Error:", e.message);
      }
    }

    io.to(String(roomId)).emit('messagesRead', { roomId: String(roomId), readBy: userRole });
  });

  // 약속 조율 (제안/수정/확정/다시정하기) 이벤트
  socket.on('updateAppointment', async (data) => {
    const { roomId, appointment } = data;
    if (isMock) {
      const chat = mockDb.chats.find(c => String(c.id) === String(roomId));
      if (chat) {
        chat.appointment_status = appointment.status;
        chat.appointment_location = appointment.location;
        chat.appointment_time = appointment.time;
        chat.appointment_proposed_by = appointment.proposedBy;
      }
    } else {
      try {
        await supabase.from('chats').update({
          appointment_status: appointment.status,
          appointment_location: appointment.location,
          appointment_time: appointment.time,
          appointment_proposed_by: appointment.proposedBy
        }).eq('id', String(roomId));
      } catch (e) {
        console.error("DB Update Appointment Error:", e.message);
      }
    }

    io.to(String(roomId)).emit('appointmentUpdated', { roomId: String(roomId), appointment });
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
  const { status, reward, category, search } = req.query;

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

    if (search && search.trim().length >= 2) {
      const keyword = search.trim().toLowerCase();
      filtered = filtered.filter(p => {
        const titleMatch = p.title && p.title.toLowerCase().includes(keyword);
        const contentMatch = p.content && p.content.toLowerCase().includes(keyword);
        const tagMatch = p.tags && Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(keyword));
        const majorMatch = (p.author_major && p.author_major.toLowerCase().includes(keyword)) || 
                           (p.major_tag && p.major_tag.toLowerCase().includes(keyword));
        return titleMatch || contentMatch || tagMatch || majorMatch;
      });
    }

    // Sort by created_at desc by default
    const sorted = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json(sorted);
  }

  try {
    let query = supabase.from('posts').select('*');

    if (status === 'recruiting') {
      query = query.eq('status', '모집중');
    } else if (status === 'completed') {
      query = query.eq('status', '모집완료');
    }
    
    if (reward) {
      query = query.eq('reward', reward);
    }
    
    if (category && category !== '전체') {
      query = query.contains('tags', [category]); 
    }

    let { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // DB 스키마 차이로 인한 500 에러를 방지하고 통합 매칭을 안전하게 수행
    if (data && search && search.trim().length >= 2) {
      const keyword = search.trim().toLowerCase();
      data = data.filter(p => {
        const titleMatch = p.title && p.title.toLowerCase().includes(keyword);
        const contentMatch = p.content && p.content.toLowerCase().includes(keyword);
        const tagMatch = p.tags && (Array.isArray(p.tags) ? p.tags.some(t => String(t).toLowerCase().includes(keyword)) : String(p.tags).toLowerCase().includes(keyword));
        const majorMatch = (p.author_major && p.author_major.toLowerCase().includes(keyword)) || 
                           (p.major_tag && p.major_tag.toLowerCase().includes(keyword));
        return titleMatch || contentMatch || tagMatch || majorMatch;
      });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Supabase Post Fetch Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts - Create a new post
app.post('/api/posts', async (req, res) => {
  const { title, content, tags, reward, author_grade, author_major, grade_tag, major_tag } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const finalGrade = grade_tag || author_grade || '1학년';
  const finalMajor = major_tag || author_major || '일반학과';

  const newPost = {
    title,
    content,
    tags: tags || [],
    reward: reward || '없음',
    author_grade: finalGrade,
    author_major: finalMajor,
    grade_tag: finalGrade,
    major_tag: finalMajor,
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
    const chatsWithUnread = mockDb.chats.map(chat => {
      const unreadCount = mockDb.messages.filter(m => String(m.room_id) === String(chat.id) && !m.is_read).length;
      return { ...chat, unreadCount };
    });
    return res.json(chatsWithUnread);
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
    id: String(id), post_id: postId, post_title: postTitle, partner_name: partnerName, 
    partner_grade: partnerGrade, last_message: lastMessage, last_time: lastTime, created_at: new Date().toISOString()
  };

  if (isMock) {
    mockDb.chats.push(newChat);
    if (initialMsgs) {
      initialMsgs.forEach(m => mockDb.messages.push({
        id: m.id.toString(), room_id: String(id), sender: m.sender, text: m.text, time: m.time, is_read: false, created_at: new Date().toISOString()
      }));
    }
    return res.status(201).json(newChat);
  }

  try {
    const { data, error } = await supabase.from('chats').insert([newChat]).select();
    if (error) throw error;

    if (initialMsgs && initialMsgs.length > 0) {
      const msgsToInsert = initialMsgs.map(m => ({
        id: m.id.toString(), room_id: String(id), sender: m.sender, text: m.text, time: m.time, is_read: false, created_at: new Date().toISOString()
      }));
      await supabase.from('messages').insert(msgsToInsert);
    }

    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/:roomId - Fetch single chat details
app.get('/api/chats/:roomId', async (req, res) => {
  const { roomId } = req.params;
  if (isMock) {
    const chat = mockDb.chats.find(c => String(c.id) === String(roomId));
    return res.json(chat || null);
  }
  try {
    const { data, error } = await supabase.from('chats').select('*').eq('id', String(roomId)).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/:roomId/messages - Fetch messages for a room
app.get('/api/chats/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  if (isMock) {
    const msgs = mockDb.messages.filter(m => String(m.room_id) === String(roomId));
    return res.json(msgs);
  }
  try {
    const { data, error } = await supabase.from('messages').select('*').eq('room_id', String(roomId)).order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/:roomId/read - Mark messages as read via HTTP API
app.post('/api/chats/:roomId/read', async (req, res) => {
  const { roomId } = req.params;
  const { userRole } = req.body;
  if (isMock) {
    mockDb.messages.forEach(m => {
      if (String(m.room_id) === String(roomId) && m.sender !== userRole) {
        m.is_read = true;
      }
    });
    return res.json({ success: true });
  }
  try {
    await supabase.from('messages').update({ is_read: true }).eq('room_id', String(roomId)).neq('sender', userRole);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Database mode: ${isMock ? 'Mock DB (In-memory)' : 'Supabase Cloud'}`);
});
