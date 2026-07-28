const express = require('express');
const teamController = require('../controllers/teamController');

const router = express.Router();

// 고정 경로(/by-code)는 나중에 /:id 같은 동적 라우트가 생기더라도 그보다 위에 둬야 함
router.get('/by-code', teamController.getTeamByCode);
router.get('/current', teamController.getCurrentTeam);

module.exports = router;
