const { loadCurriculum } = require('../data/loadCurriculum');

exports.getCourses = (req, res) => {
  try {
    const courses = loadCurriculum();
    res.status(200).json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
