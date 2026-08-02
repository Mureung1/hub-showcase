import { Router } from 'express';
import { signup, login, getUserById } from '../services/auth/authService.js';
import { requireAuth } from '../services/auth/requireAuth.js';
import { AppError } from '../utils/errors.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { employee_no, name, password, department } = req.body;
    if (!employee_no || !name || !password) {
      throw new AppError(400, 'invalid_request', 'employee_no, name, password는 필수입니다.');
    }
    const user = await signup({ employeeNo: employee_no, name, password, department });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { employee_no, password } = req.body;
    if (!employee_no || !password) {
      throw new AppError(400, 'invalid_request', 'employee_no, password는 필수입니다.');
    }
    const user = await login({ employeeNo: employee_no, password });
    req.session.userId = user.id;
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', requireAuth, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).send();
  });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json({ user: await getUserById(req.session.userId) });
  } catch (err) {
    next(err);
  }
});

export default router;
