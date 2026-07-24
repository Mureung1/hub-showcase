const express = require('express');

const { createMessage, listMessages } = require('../controllers/messages.controller');

// mergeParams: true로 부모 라우터(applications.routes.js)의 :applicationId를 그대로 받는다.
// 인증(authenticate)은 부모 라우터에서 이미 적용되어 있으므로 여기서 다시 걸지 않는다.
const router = express.Router({ mergeParams: true });

router.get('/', listMessages);
router.post('/', createMessage);

module.exports = router;
