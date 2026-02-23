import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("tasks.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6366f1'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    priority INTEGER DEFAULT 1, -- 1: Low, 2: Medium, 3: High
    difficulty INTEGER DEFAULT 1, -- 1: Easy, 2: Medium, 3: Hard
    category_id INTEGER,
    completed INTEGER DEFAULT 0,
    tags TEXT, -- JSON array string
    stress_detected INTEGER DEFAULT 0,
    suggested_duration INTEGER, -- in minutes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  INSERT OR IGNORE INTO categories (name, color) VALUES ('Work', '#ef4444');
  INSERT OR IGNORE INTO categories (name, color) VALUES ('Personal', '#10b981');
  INSERT OR IGNORE INTO categories (name, color) VALUES ('Study', '#3b82f6');
  INSERT OR IGNORE INTO categories (name, color) VALUES ('Health', '#f59e0b');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare("SELECT tasks.*, categories.name as category_name, categories.color as category_color FROM tasks LEFT JOIN categories ON tasks.category_id = categories.id ORDER BY completed ASC, priority DESC, due_date ASC").all();
    res.json(tasks.map(t => ({ ...t, tags: JSON.parse(t.tags || '[]'), completed: !!t.completed, stress_detected: !!t.stress_detected })));
  });

  app.post("/api/tasks", (req, res) => {
    const { title, description, due_date, priority, difficulty, category_id, tags, stress_detected, suggested_duration } = req.body;
    const info = db.prepare(`
      INSERT INTO tasks (title, description, due_date, priority, difficulty, category_id, tags, stress_detected, suggested_duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, due_date, priority, difficulty, category_id, JSON.stringify(tags || []), stress_detected ? 1 : 0, suggested_duration);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const { title, description, due_date, priority, difficulty, category_id, completed, tags, stress_detected, suggested_duration } = req.body;
    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        due_date = COALESCE(?, due_date),
        priority = COALESCE(?, priority),
        difficulty = COALESCE(?, difficulty),
        category_id = COALESCE(?, category_id),
        completed = COALESCE(?, completed),
        tags = COALESCE(?, tags),
        stress_detected = COALESCE(?, stress_detected),
        suggested_duration = COALESCE(?, suggested_duration),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, description, due_date, priority, difficulty, category_id, completed !== undefined ? (completed ? 1 : 0) : null, tags ? JSON.stringify(tags) : null, stress_detected !== undefined ? (stress_detected ? 1 : 0) : null, suggested_duration, id);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  // Analytics endpoint
  app.get("/api/analytics", (req, res) => {
    const totalTasks = db.prepare("SELECT COUNT(*) as count FROM tasks").get().count;
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE completed = 1").get().count;
    const categoryStats = db.prepare(`
      SELECT categories.name, COUNT(tasks.id) as count
      FROM categories
      LEFT JOIN tasks ON categories.id = tasks.category_id
      GROUP BY categories.id
    `).all();
    
    res.json({
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      categoryStats
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
