const supabase = require('../config/supabaseClient');

// 로그인 시스템이 없어 "사용자"를 구분할 수 없다 — 브라우저별로 발급되는
// session_id(client가 localStorage에 저장해 매 요청마다 실어 보냄)로 대신 구분한다.
exports.createBasketItem = async (req, res) => {
  const { course_name, credits, is_major, session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id는 필수입니다.' });
  }

  const { data, error } = await supabase
    .from('basket_items')
    .insert([
      {
        course_name,
        credits,
        is_major,
        session_id,
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
};

exports.getBasketItems = async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id는 필수입니다.' });
  }

  const { data, error } = await supabase
    .from('basket_items')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
};

// 과목을 뺄 때 실제로 DB에서도 지운다 (예전엔 로컬 상태만 바꾸고 서버엔
// 반영이 안 돼서, basket_items가 지워지는 일 없이 계속 쌓이기만 했다).
exports.deleteBasketItem = async (req, res) => {
  const { id } = req.params;
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id는 필수입니다.' });
  }

  const { data, error } = await supabase
    .from('basket_items')
    .delete()
    .eq('id', id)
    .eq('session_id', session_id)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data[0] ?? null);
};