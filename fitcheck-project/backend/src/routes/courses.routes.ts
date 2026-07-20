import { Router } from 'express';
import { getCourse, getCourses } from '../controllers/courses.controller.js';

const router = Router();

router.get('/', getCourses);
router.get('/:id', getCourse);

export default router;
