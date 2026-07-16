const supabase = require('../config/supabaseClient');

exports.createBasketItem = async (req, res) => {
  const { course_name, credits, is_major } = req.body;

  const { data, error } = await supabase
    .from('basket_items')
    .insert([
      {
        course_name,
        credits,
        is_major,
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
};

exports.getBasketItems = async (req, res) => {
  const { data, error } = await supabase
    .from('basket_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
};