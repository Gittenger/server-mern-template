const express = require('express');
const userController = require('../_controllers/user.controller');
const authController = require('../_controllers/auth.controller');

const { getAllUsers, getUser } = userController;

const router = express.Router();

router.route('/').get(getAllUsers);
router.route('/:id').get(getUser);

module.exports = router;
