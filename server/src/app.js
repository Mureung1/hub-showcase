import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import { supabase, isMock, mockDb } from './supabase.js';

dotenv.config();

// Supabase Admin Client (Service Role Key로 유저 생성 등 관리 작업 수행)
const supabaseAdmin = (!isMock && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

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
        await (supabaseAdmin || supabase).from('messages').insert([dbMsg]);
        await (supabaseAdmin || supabase).from('chats').update({ last_message: dbMsg.text, last_time: dbMsg.time }).eq('id', data.roomId);
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
        const db = supabaseAdmin || supabase;
        await db
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
        await (supabaseAdmin || supabase).from('chats').update({
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

// ===== 인증 미들웨어 (authenticateToken) =====
// Bearer 토큰을 검증하여 req.user에 인증된 유저 정보를 주입합니다.
const authenticateToken = async (req, res, next) => {
  // Mock 모드: 테스트용 유저로 자동 통과
  if (isMock) {
    req.user = mockDb.profiles.length > 0
      ? mockDb.profiles[0]
      : { id: 'mock-user-id', username: 'mock-user' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
    }

    // 프로필 정보도 함께 조회하여 req.user에 주입
    const { data: profile } = await (supabaseAdmin || supabase).from('profiles').select('*').eq('id', user.id).maybeSingle();
    req.user = profile || { id: user.id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: '토큰 검증 중 오류가 발생했습니다' });
  }
};

// ===== Auth API =====

// POST /api/auth/signup - 회원가입 (Supabase Auth 유저 생성 + profiles 저장)
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, username, userId } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: '이메일, 비밀번호, 아이디는 필수 입력입니다' });
  }

  // 아이디 형식 검증
  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return res.status(400).json({ error: '2~20자 영문, 숫자, 밑줄(_)만 사용 가능합니다' });
  }

  if (isMock) {
    // Mock 모드: 중복 검사 후 메모리에 저장
    const existingEmail = mockDb.profiles.find(p => p.email === email);
    if (existingEmail) return res.status(400).json({ error: '이미 가입된 이메일입니다. 로그인해 주세요.' });

    const existingUsername = mockDb.profiles.find(p => p.username === username);
    if (existingUsername) return res.status(400).json({ error: '이미 사용 중인 아이디입니다' });

    const userId = crypto.randomUUID();
    mockDb.profiles.push({ id: userId, username, email, email_verified: true, created_at: new Date().toISOString() });
    return res.status(201).json({ success: true, userId, username });
  }

  try {
    // 아이디 중복 확인
    const { data: existingProfile } = await (supabaseAdmin || supabase).from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingProfile) return res.status(400).json({ error: '이미 사용 중인 아이디입니다' });

    if (!supabaseAdmin) {
      throw new Error('서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY가 .env에 설정되지 않았습니다.');
    }

    let authUserId = userId;

    if (authUserId) {
      // 1. OTP 검증으로 이미 auth.users에 존재하는 유저의 비밀번호만 업데이트
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true
      });
      if (authError) throw authError;
    } else {
      // 2. 혹시 OTP 과정을 거치지 않은 경우 신규 유저 생성 (Mock 또는 강제 가입시)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (authError) {
        if (authError.message.includes('already') || authError.message.includes('exists')) {
          return res.status(400).json({ error: '이미 가입된 이메일입니다. 로그인해 주세요.' });
        }
        throw authError;
      }
      authUserId = authData.user.id;
    }

    // profiles 테이블에 저장 (RLS 우회를 위해 Admin 권한 사용)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
      id: authUserId,
      username,
      email,
      email_verified: true
    }]);

    if (profileError) throw profileError;

    res.status(201).json({ success: true, userId: authUserId, username });
  } catch (err) {
    console.error('회원가입 에러:', err.message);
    res.status(500).json({ error: err.message || '회원가입에 실패했습니다' });
  }
});

// POST /api/auth/login - 로그인 (username → email 조회 후 반환)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해 주세요' });
  }

  if (isMock) {
    const profile = mockDb.profiles.find(p => p.username === username);
    if (!profile) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    return res.json({ success: true, email: profile.email, userId: profile.id, username: profile.username });
  }

  try {
    // username으로 profiles 테이블에서 email 조회
    const { data: profile, error } = await (supabaseAdmin || supabase).from('profiles').select('*').eq('username', username).maybeSingle();

    if (error || !profile) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    // 프론트엔드에서 이 email로 Supabase Auth signInWithPassword를 호출함
    res.json({ success: true, email: profile.email, userId: profile.id, username: profile.username });
  } catch (err) {
    console.error('로그인 에러:', err.message);
    res.status(500).json({ error: '서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

// GET /api/auth/check-username - 아이디 중복 확인
app.get('/api/auth/check-username', async (req, res) => {
  const { username } = req.query;

  if (!username || !/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return res.json({ available: false });
  }

  if (isMock) {
    const exists = mockDb.profiles.some(p => p.username === username);
    return res.json({ available: !exists });
  }

  try {
    const { data } = await (supabaseAdmin || supabase).from('profiles').select('id').eq('username', username).maybeSingle();
    res.json({ available: !data });
  } catch (err) {
    res.status(500).json({ available: false, error: err.message });
  }
});

// GET /api/auth/me - 현재 유저 정보 반환 (JWT 토큰으로 조회)
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다' });
  }

  const token = authHeader.split(' ')[1];

  if (isMock) {
    // Mock 모드: 첫 번째 프로필 반환 (테스트용)
    if (mockDb.profiles.length > 0) {
      return res.json(mockDb.profiles[0]);
    }
    return res.status(404).json({ error: '유저를 찾을 수 없습니다' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다' });
    }

    const { data: profile } = await (supabaseAdmin || supabase).from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!profile) {
      return res.status(404).json({ error: '프로필을 찾을 수 없습니다' });
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    const db = supabaseAdmin || supabase;
    let query = db.from('posts').select('*');

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

// POST /api/posts - Create a new post (인증 필수)
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { title, content, tags, reward, author_grade, author_major, grade_tag, major_tag, author_name } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const finalGrade = grade_tag || author_grade || '1학년';
  const finalMajor = major_tag || author_major || '일반학과';

  // 서버에서 인증된 유저의 ID를 강제 설정 (클라이언트 조작 방지)
  const newPost = {
    title,
    content,
    tags: tags || [],
    reward: reward || '없음',
    author_grade: finalGrade,
    author_major: finalMajor,
    author_id: req.user.id,
    author_name: author_name || req.user.username,
    created_at: new Date().toISOString()
  };

  if (isMock) {
    const created = { id: String(mockDb.posts.length + 1), grade_tag: finalGrade, major_tag: finalMajor, ...newPost };
    mockDb.posts.push(created);
    return res.status(201).json(created);
  }

  try {
    const db = supabaseAdmin || supabase;
    const { data, error } = await db
      .from('posts')
      .insert([newPost])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Supabase Post Insert Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id/has-chats - 게시글에 생성된 채팅방이 있는지 확인
app.get('/api/posts/:id/has-chats', async (req, res) => {
  const postId = req.params.id;
  if (isMock) {
    const hasChats = mockDb.chats.some(c => String(c.post_id) === String(postId));
    return res.json({ hasChats });
  }

  try {
    const db = supabaseAdmin || supabase;
    const { count, error } = await db
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
      
    if (error) throw error;
    res.json({ hasChats: count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id/requests - 게시글에 달린 신청 목록 조회
app.get('/api/posts/:id/requests', async (req, res) => {
  const postId = req.params.id;
  if (isMock) {
    const reqs = mockDb.chat_requests.filter(r => String(r.post_id) === String(postId) && r.status === 'pending');
    return res.json(reqs);
  }
  try {
    const db = supabaseAdmin || supabase;
    const { data, error } = await db.from('chat_requests').select('*').eq('post_id', postId).eq('status', 'pending');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/requests - 1:1 채팅 신청 (인증 필수 + 본인 글 자가 신청 방지)
app.post('/api/posts/:id/requests', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: '신청 메시지가 누락되었습니다' });
  }

  // 본인 글에 본인이 신청하는 것 방지
  if (!isMock) {
    const db = supabaseAdmin || supabase;
    const { data: post } = await db.from('posts').select('author_id').eq('id', postId).maybeSingle();
    if (post && String(post.author_id) === String(req.user.id)) {
      return res.status(400).json({ error: '본인의 게시글에는 신청할 수 없습니다' });
    }
  }

  // 서버에서 인증된 유저 정보를 강제 설정 (클라이언트 조작 방지)
  const newRequest = {
    post_id: postId,
    helper_id: req.user.id,
    helper_name: req.user.username || req.user.email,
    message,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  if (isMock) {
    newRequest.id = String(mockDb.chat_requests.length + 1);
    mockDb.chat_requests.push(newRequest);
    return res.status(201).json(newRequest);
  }

  try {
    const db = supabaseAdmin || supabase;
    const { data, error } = await db.from('chat_requests').insert([newRequest]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/requests/:reqId/accept - 신청 수락 및 방 생성 (인증 필수 + 글 작성자 본인 검증)
app.post('/api/posts/:id/requests/:reqId/accept', authenticateToken, async (req, res) => {
  const { id: postId, reqId } = req.params;
  
  try {
    const db = supabaseAdmin || supabase;
    let request;
    if (isMock) {
      request = mockDb.chat_requests.find(r => String(r.id) === String(reqId));
      if (!request) throw new Error('신청을 찾을 수 없습니다.');
    } else {
      const { data, error } = await db.from('chat_requests').select('*').eq('id', reqId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('신청을 찾을 수 없습니다.');
      request = data;
    }

    // 글 작성자 본인만 수락 가능 (서버측 검증)
    if (!isMock) {
      const { data: post } = await db.from('posts').select('author_id').eq('id', postId).maybeSingle();
      if (!post) throw new Error('게시글을 찾을 수 없습니다.');
      if (String(post.author_id) !== String(req.user.id)) {
        return res.status(403).json({ error: '본인의 게시글에 대한 신청만 수락할 수 있습니다' });
      }
    }

    const { post_title, partner_grade } = req.body; 
    const newChatId = Math.random().toString(36).substr(2, 9);
    const newChat = {
      ...(newChatId ? { id: newChatId } : {}),
      post_id: postId,
      post_title: post_title || '무제',
      host_id: req.user.id,
      host_name: req.user.username || req.user.email || '방장',
      helper_id: request.helper_id,
      helper_name: request.helper_name,
      partner_grade: partner_grade || '미상',
      last_message: request.message,
      last_time: new Date().toISOString()
    };

    let createdChat;
    if (isMock) {
      mockDb.chats.push({ ...newChat, created_at: new Date().toISOString() });
      createdChat = newChat;
      mockDb.chat_requests.forEach(r => {
        if (String(r.post_id) === String(postId)) {
          r.status = (String(r.id) === String(reqId)) ? 'accepted' : 'rejected';
        }
      });
      mockDb.messages.push({
        id: 'mock-msg-' + Date.now(), room_id: newChat.id, sender: 'helper', text: request.message, time: newChat.last_time, is_read: false
      });
    } else {
      const { data: chatData, error: chatError } = await db.from('chats').insert([newChat]).select();
      if (chatError) throw chatError;
      createdChat = chatData[0];

      await db.from('messages').insert([{
        room_id: createdChat.id, sender: 'helper', text: request.message, time: createdChat.last_time, is_read: false
      }]);

      await db.from('chat_requests').update({ status: 'rejected' }).eq('post_id', postId).neq('id', reqId);
      await db.from('chat_requests').update({ status: 'accepted' }).eq('id', reqId);
    }
    
    res.json(createdChat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/posts/:id - 게시글 수정 (인증 필수 + 작성자 본인 검증)
app.put('/api/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { title, content, tags, reward, author_grade, author_major, grade_tag, major_tag } = req.body;

  const updateData = {
    title, content, tags: tags || [], reward,
    author_grade: grade_tag || author_grade || '1학년',
    author_major: major_tag || author_major || '일반학과'
  };

  if (isMock) {
    const postIndex = mockDb.posts.findIndex(p => String(p.id) === String(postId));
    if (postIndex === -1) return res.status(404).json({ error: 'Post not found' });
    mockDb.posts[postIndex] = { ...mockDb.posts[postIndex], ...updateData };
    return res.json(mockDb.posts[postIndex]);
  }

  try {
    const db = supabaseAdmin || supabase;

    // 작성자 본인 검증
    const { data: existingPost } = await db.from('posts').select('author_id').eq('id', postId).maybeSingle();
    if (!existingPost) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
    if (String(existingPost.author_id) !== String(req.user.id)) {
      return res.status(403).json({ error: '본인의 게시글만 수정할 수 있습니다' });
    }

    const { data, error } = await db
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id - 게시글 삭제 (인증 필수 + 작성자 본인 검증)
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  
  if (isMock) {
    mockDb.posts = mockDb.posts.filter(p => String(p.id) !== String(postId));
    return res.json({ success: true });
  }

  try {
    const db = supabaseAdmin || supabase;

    // 작성자 본인 검증
    const { data: existingPost } = await db.from('posts').select('author_id').eq('id', postId).maybeSingle();
    if (!existingPost) return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
    if (String(existingPost.author_id) !== String(req.user.id)) {
      return res.status(403).json({ error: '본인의 게시글만 삭제할 수 있습니다' });
    }

    const { error } = await db.from('posts').delete().eq('id', postId);
    if (error) throw error;
    res.json({ success: true });
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
    const { data, error } = await (supabaseAdmin || supabase).from('chats').select('*').order('last_time', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats - Create a chat room
app.post('/api/chats', async (req, res) => {
  const { id, postId, postTitle, host_name, partnerName, partnerGrade, lastMessage, lastTime, initialMsgs, host_id, helper_id } = req.body;
  
  const newChat = {
    id: String(id), post_id: postId, post_title: postTitle, host_name: host_name, helper_name: partnerName, 
    partner_grade: partnerGrade, last_message: lastMessage, last_time: lastTime, 
    host_id, helper_id, created_at: new Date().toISOString()
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
    const db = supabaseAdmin || supabase;
    const { data, error } = await db.from('chats').insert([newChat]).select();
    if (error) throw error;

    if (initialMsgs && initialMsgs.length > 0) {
      const msgsToInsert = initialMsgs.map(m => ({
        id: m.id.toString(), room_id: String(id), sender: m.sender, text: m.text, time: m.time, is_read: false, created_at: new Date().toISOString()
      }));
      await (supabaseAdmin || supabase).from('messages').insert(msgsToInsert);
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
    const db = supabaseAdmin || supabase;
    const { data, error } = await db.from('chats').select('*').eq('id', String(roomId)).maybeSingle();
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
    const db = supabaseAdmin || supabase;
    const { data, error } = await db.from('messages').select('*').eq('room_id', String(roomId)).order('created_at', { ascending: true });
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
    await (supabaseAdmin || supabase).from('messages').update({ is_read: true }).eq('room_id', String(roomId)).neq('sender', userRole);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Database mode: ${isMock ? 'Mock DB (In-memory)' : 'Supabase Cloud'}`);
});
