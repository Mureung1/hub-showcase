const env = require('./config/env');
const app = require('./app');

app.listen(env.port, () => {
  console.log(`Server is running on http://localhost:${env.port}`);
});
