import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import authRouter from './routes/auth.js';
import { errorHandler } from './utils/errors.js';

const app = express();

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.use('/v1/auth', authRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`gateway server listening on port ${PORT}`);
});
