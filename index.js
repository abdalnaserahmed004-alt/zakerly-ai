const express = require('express');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const SECRET = process.env.JWT_SECRET || "zakerly-secret";
const ADMIN_PATH = "/zkr-admin-9921";

let users = [];
let courses = [];
let ads = [];
let bannedIPs = [];

function getIP(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
}

app.get('/', (req, res) => {
  res.render('index', { ads });
});

app.post('/register', async (req, res) => {
  const ip = getIP(req);
  if (bannedIPs.includes(ip)) return res.send("🚫 أنت محظور");
  const { name, phone, parentPhone, city } = req.body;
  const hashed = await bcrypt.hash(phone, 10);
  users.push({ name, phone, parentPhone, city, ip, username: phone, password: hashed, progress: {} });
  res.send("✅ تم التسجيل - استنى التفعيل");
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.send("❌ مش موجود");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.send("❌ غلط");
  const token = jwt.sign({ username }, SECRET);
  res.redirect(`/dashboard?token=${token}`);
});

function auth(req, res, next) {
  try {
    const decoded = jwt.verify(req.query.token, SECRET);
    req.user = users.find(u => u.username === decoded.username);
    next();
  } catch { res.send("Unauthorized"); }
}

app.get('/dashboard', auth, (req, res) => {
  res.render('dashboard', { user: req.user, courses, ads, token: req.query.token });
});

app.post('/ai-chat', auth, async (req, res) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.AI_API_KEY}`,
      { contents: [{ parts: [{ text: req.body.question }] }] }
    );
    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ مفيش رد";
    res.send(reply);
  } catch { res.send("AI Error"); }
});

// Admin Routes ... (بقية الكود بتاعك كما هو)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Zakerly PRO Running"));

// مهم جداً لـ Vercel
module.exports = app;
