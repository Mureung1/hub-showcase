const app = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[GNU Course AI Backend] Server is running on port ${PORT}`);
});
