const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const responseHelper = require('../utils/responseHelper');
const { VALIDATION_ERROR, INTERNAL_ERROR } = require('../constants/errorCodes');
const { createUser, getUserByEmail } = require('../models/userModel');

const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return responseHelper.error(res, VALIDATION_ERROR, "Email and password are required", null, 400);
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return responseHelper.error(res, VALIDATION_ERROR, "User with this email already exists", null, 400);
    }

    // Hash password & save user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = await createUser(email, hashedPassword);
    
    // Generate JWT
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    return responseHelper.success(res, {
      user: { id: newUser.id, email: newUser.email },
      token
    }, "User registered successfully");
    
  } catch (error) {
    console.error('Registration error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, "Server error during registration", null, 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return responseHelper.error(res, VALIDATION_ERROR, "Email and password are required", null, 400);
    }
    
    // Find User
    const user = await getUserByEmail(email);
    if (!user) {
      return responseHelper.error(res, VALIDATION_ERROR, "Invalid credentials", null, 401);
    }
    
    // Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return responseHelper.error(res, VALIDATION_ERROR, "Invalid credentials", null, 401);
    }
    
    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    return responseHelper.success(res, {
      user: { id: user.id, email: user.email },
      token
    }, "Logged in successfully");
    
  } catch (error) {
    console.error('Login error:', error);
    return responseHelper.error(res, INTERNAL_ERROR, "Server error during login", null, 500);
  }
};

module.exports = {
  register,
  login
};
