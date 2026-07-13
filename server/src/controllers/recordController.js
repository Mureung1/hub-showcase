const supabase = require('../config/supabaseClient');

exports.createRecord = async (req, res) => {
  const { userId, totalCredits, majorCredits, generalCredits } = req.body;

  const { data, error } = await supabase
    .from('user_records')
    .insert([
      {
        user_id: userId,
        total_credits: totalCredits,
        major_credits: majorCredits,
        general_credits: generalCredits,
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data);
};

exports.getRecordByUserId = async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from('user_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ message: '데이터가 없습니다' });
  }

  res.status(200).json(data[0]);
};