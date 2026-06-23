const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db'); // 引入資料庫模組

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. 取得所有成員名單
// ==========================================
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==========================================
// 2. 新增成員
// ==========================================
app.post('/api/users', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "請提供姓名" });

    db.run("INSERT INTO users (name) VALUES (?)", [name], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// ==========================================
// 3. 刪除成員 (包含連動刪除課表)
// ==========================================
app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    // 因為開了 ON DELETE CASCADE，刪除 user 時 schedules 的資料也會被 SQLite 自動清掉
    db.run("DELETE FROM users WHERE id = ?", [userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "成員刪除成功", affectedRows: this.changes });
    });
});

// ==========================================
// 4. 取得所有人的課表資料 (打包成前端要的結構)
// ==========================================
app.get('/api/schedules', (req, res) => {
    db.all("SELECT * FROM schedules", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // 把 SQLite 的扁平資料轉換成 Vue 習慣的 `{ userId: { day: { period: 1 } } }` 格式
        const result = {};
        rows.forEach(row => {
            if (!result[row.user_id]) result[row.user_id] = {};
            if (!result[row.user_id][row.day_of_week]) result[row.user_id][row.day_of_week] = {};
            result[row.user_id][row.day_of_week][row.period] = row.is_busy;
        });
        res.json(result);
    });
});

// ==========================================
// 5. 儲存/更新某個使用者的完整課表 (覆蓋寫入)
// ==========================================
app.post('/api/schedules/save', (req, res) => {
    const { userId, userSchedule } = req.body; // userSchedule 結構: { '1': { '1': 1, '2': 1 }, '2': {} ... }
    
    if (!userId) return res.status(400).json({ error: "缺少使用者 ID" });

    // 先清空該使用者原本的所有舊課表
    db.run("DELETE FROM schedules WHERE user_id = ?", [userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // 如果傳進來的課表是空的，清空就代表完成了
        if (!userSchedule || Object.keys(userSchedule).length === 0) {
            return res.json({ message: "課表已成功清空儲存" });
        }

        // 準備批量插入新勾選的有課時段
        const stmt = db.prepare("INSERT INTO schedules (user_id, day_of_week, period) VALUES (?, ?, ?)");
        
        try {
            for (const day in userSchedule) {
                for (const period in userSchedule[day]) {
                    if (userSchedule[day][period] === 1) {
                        stmt.run(userId, parseInt(day), parseInt(period));
                    }
                }
            }
            stmt.finalize();
            res.json({ message: "課表更新成功！" });
        } catch (error) {
            res.status(500).json({ error: "寫入資料庫失敗" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});