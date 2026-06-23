const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 建立或連接到 empty_classroom.db 檔案
const dbPath = path.join(__dirname, 'empty_classroom.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('資料庫連接失敗:', err.message);
    } else {
        console.log('成功連接至 SQLite 資料庫！');
    }
});

// 初始化資料表
db.serialize(() => {
    // 1. 建立使用者資料表 (users)
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    `);

    // 2. 建立課表狀態資料表 (schedules)
    db.run(`
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL, -- 1~5 (週一到週五)
            period INTEGER NOT NULL,      -- 1~14 (第1節到第14節)
            is_busy INTEGER DEFAULT 1,    -- 1 代表有課/忙碌
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, day_of_week, period) -- 避免同一個人同一個時段重複塞資料
        )
    `);

    // 3. 自動生成 AI 模擬初始資料 (如果資料庫是空的才塞入)
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (row && row.count === 0) {
            console.log("偵測到空資料庫，正在生成 AI 模擬初始資料...");
            
            // 插入預設的三位成員
            const stmtUser = db.prepare("INSERT INTO users (name) VALUES (?)");
            stmtUser.run("張小明");
            stmtUser.run("李小華");
            stmtUser.run("陳小美");
            stmtUser.finalize();

            // 幫這三個人預先塞入一些「有課(is_busy=1)」的時段
            const stmtSchedule = db.prepare("INSERT INTO schedules (user_id, day_of_week, period) VALUES (?, ?, ?)");
            
            // 張小明 (user_id: 1) 週一第1,2,5節有課，週二第3,4,10,11節有課
            stmtSchedule.run(1, 1, 1); stmtSchedule.run(1, 1, 2); stmtSchedule.run(1, 1, 5);
            stmtSchedule.run(1, 2, 3); stmtSchedule.run(1, 2, 4); stmtSchedule.run(1, 2, 10); stmtSchedule.run(1, 2, 11);
            stmtSchedule.run(1, 3, 7); stmtSchedule.run(1, 3, 8);

            // 李小華 (user_id: 2)
            stmtSchedule.run(2, 1, 5); stmtSchedule.run(2, 1, 6);
            stmtSchedule.run(2, 2, 1); stmtSchedule.run(2, 2, 2);
            stmtSchedule.run(2, 3, 3); stmtSchedule.run(2, 3, 4);

            // 陳小美 (user_id: 3)
            stmtSchedule.run(3, 1, 1); stmtSchedule.run(3, 1, 2);
            stmtSchedule.run(3, 5, 1); stmtSchedule.run(3, 5, 2); stmtSchedule.run(3, 5, 3);

            stmtSchedule.finalize();
            console.log("AI 模擬資料生成完畢！");
        }
    });
});

module.exports = db;