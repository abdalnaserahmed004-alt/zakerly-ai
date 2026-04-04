const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
// ملحوظة: غيرنا البورت لـ 8080 عشان يشتغل على أغلب الاستضافات المجانية
const PORT = process.env.PORT || 8080;

// 1. رابط قاعدة البيانات (استبدل الباسورد بباسورد Atlas بتاعك)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://ahmed_admin:الباسورد_بتاعك@cluster0.n0ydbyg.mongodb.net/zakerly_final?retryWrites=true&w=majority"; 

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// 2. النماذج (Schemas)
const Student = mongoose.model('Student', new mongoose.Schema({
    phone: String, name: String, balance: { type: Number, default: 0 }, courses: [mongoose.Schema.Types.ObjectId]
}));

const Course = mongoose.model('Course', new mongoose.Schema({
    title: String, price: Number, image: String, videoUrl: String
}));

const Notice = mongoose.model('Notice', new mongoose.Schema({
    text: String, imageUrl: String, date: { type: Date, default: Date.now }
}));

const AdminSettings = mongoose.model('AdminSettings', new mongoose.Schema({
    password: { type: String, default: 'admin123' }
}));

// 3. إعدادات الذكاء الاصطناعي (Gemini API)
const genAI = new GoogleGenerativeAI("AIzaSyDrIM_nIPEhzDYn01KXC_X-5I6VTEDOjf8");

app.use(session({ secret: 'zakerly_secret_key_2026', resave: false, saveUninitialized: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- التنسيق (CSS) ---
const getTheme = () => `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
    :root { --main: #0ea5e9; --bg: #0f172a; --card: #1e293b; --text: #f1f5f9; --accent: #fbbf24; }
    body { margin: 0; font-family: 'Tajawal', sans-serif; background: var(--bg); color: var(--text); direction: rtl; display: flex; min-height: 100vh; }
    .sidebar { width: 260px; background: var(--card); border-left: 1px solid #334155; position: fixed; height: 100vh; display: flex; flex-direction: column; z-index: 100; }
    .sidebar-header { padding: 30px 20px; text-align: center; color: var(--main); font-size: 1.5rem; font-weight: bold; border-bottom: 1px solid #334155; }
    .nav-links { padding: 20px; flex: 1; }
    .nav-item { display: flex; align-items: center; padding: 12px 15px; color: #94a3b8; text-decoration: none; border-radius: 10px; margin-bottom: 8px; transition: 0.3s; }
    .nav-item:hover, .nav-item.active { background: var(--main); color: #000; font-weight: bold; }
    .content { margin-right: 260px; flex: 1; padding: 20px; width: calc(100% - 260px); }
    .notice-board { background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid var(--main); border-radius: 15px; padding: 20px; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .card { background: var(--card); border-radius: 15px; overflow: hidden; border: 1px solid #334155; transition: 0.3s; padding: 15px; }
    .btn { background: var(--main); color: #000; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; display: block; text-align: center; width: 100%; margin-top: 10px; }
    input, textarea { width: 100%; padding: 12px; margin: 8px 0; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 8px; box-sizing: border-box; }
    .dev-footer { padding: 15px; background: #0b1120; border-top: 1px solid #334155; text-align: center; font-size: 0.8rem; color: #475569; }
</style>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
`;

const layout = (user, content, activePage = 'home') => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ZAKERLY | ${user.name}</title>${getTheme()}</head>
<body>
    <div class="sidebar">
        <div class="sidebar-header">ZAKERLY</div>
        <div class="nav-links">
            <a href="/dashboard" class="nav-item ${activePage === 'home' ? 'active' : ''}"><i class="fas fa-th-large"></i>&nbsp; المنصة</a>
            <a href="/ai-tutor" class="nav-item ${activePage === 'ai' ? 'active' : ''}"><i class="fas fa-robot"></i>&nbsp; اسأل المستر (AI)</a>
            <a href="/admin" class="nav-item"><i class="fas fa-user-shield"></i>&nbsp; لوحة المستر</a>
        </div>
        <div class="dev-footer">تم التطوير بواسطة رامي مجدي</div>
    </div>
    <div class="content">${content}</div>
</body>
</html>
`;

// --- المسارات (Routes) ---

app.get('/', (req, res) => {
    res.send(`<body style="background:#0f172a; color:white; font-family:'Tajawal'; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; direction:rtl;">
        <div style="background:#1e293b; padding:40px; border-radius:20px; width:330px; text-align:center; border-top: 5px solid #0ea5e9;">
            <h1 style="color:#0ea5e9; margin-bottom:10px;">ZAKERLY</h1>
            <p style="color:#94a3b8; margin-bottom:30px;">مرحباً بك في إمبراطورية المذاكرة</p>
            <form action="/login" method="POST">
                <input type="text" name="phone" placeholder="رقم الموبايل" required>
                <input type="text" name="name" placeholder="الاسم بالكامل" required>
                <button class="btn" style="width:100%; margin-top:20px;">دخول للمنصة</button>
            </form>
        </div>
    </body>`);
});

app.post('/login', async (req, res) => {
    const { phone, name } = req.body;
    let student = await Student.findOne({ phone });
    if (!student) { student = new Student({ phone, name }); await student.save(); }
    req.session.userId = student._id;
    res.redirect('/dashboard');
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.redirect('/');
    const user = await Student.findById(req.session.userId);
    const courses = await Course.find();
    const notice = await Notice.findOne().sort({ date: -1 });

    let content = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>مرحباً، ${user.name} 👋</h2>
            <div style="background:var(--main); color:#000; padding:8px 20px; border-radius:50px; font-weight:bold;">رصيدك: ${user.balance} ج.م</div>
        </div>
        ${notice ? `<div class="notice-board"><h3>📢 إعلان:</h3><p>${notice.text}</p></div>` : ''}
        <div class="grid">
            ${courses.map(c => `<div class="card"><h4>${c.title}</h4><p>${c.price} ج.م</p><button class="btn">شراء الحصة</button></div>`).join('')}
        </div>
    `;
    res.send(layout(user, content));
});

// تشغيل السيرفر على 0.0.0.0 عشان الاستضافات السحابية
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is live on port ${PORT}`);
});

