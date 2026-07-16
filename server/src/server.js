const app = require('./app');

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Mock server is running on http://localhost:${port}`);
});
