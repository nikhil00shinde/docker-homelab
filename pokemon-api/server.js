const express = require("express");
const os = require("os");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();
const PORT = 3000;

app.use(express.json());

// PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "pokedex",
  user: process.env.DB_USER || "trainer",
  password: process.env.DB_PASSWORD || "pokemon123",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "redis",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.connect().catch(console.error);

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pokemon (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        level INTEGER DEFAULT 1,
        caught_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query("SELECT COUNT(*) FROM pokemon");
    const count = parseInt(result.rows[0].count, 10);

    if (count === 0) {
      await pool.query(`
        INSERT INTO pokemon (name, type, level) VALUES
          ('Pikachu','Electric', 25),
          ('Charizard', 'Fire', 50),
          ('Blastoise', 'Water', 48)
      `);
    }

    console.log("Database initialized");
  } catch (err) {
    console.log("Database initialization error:", err);
    process.exit(1);
  }
}

initDatabase();

// Health
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({
      status: "healthy",
      database: "connected",
      timestamp: Math.floor(process.uptime()),
      container_id: os.hostname(),
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: err.message,
    });
  }
});

// Stats
app.get("/stats", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as total FROM pokemon");
    const pokemonCount = parseInt(result.rows[0].total, 10);

    res.json({
      container: {
        id: os.hostname(),
        platform: os.platform(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        cpu_count: os.cpus().length,
      },
      database: {
        pokemon_count: pokemonCount,
        connection_pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all (cache)
app.get("/pokemon", async (req, res) => {
  const cacheKey = "pokemon:all";
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json({
        source: "cache",
        data: JSON.parse(cachedData),
      });
    }

    const result = await pool.query(
      "SELECT * FROM pokemon ORDER BY caught_at DESC"
    );

    // optional: add expiry to avoid stale cache forever
    await redisClient.set(cacheKey, JSON.stringify(result.rows), { EX: 30 });

    res.json({
      source: "database",
      total: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET by id
app.get("/pokemon/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await pool.query("SELECT * FROM pokemon WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST
app.post("/pokemon", async (req, res) => {
  const { name, type, level } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "Name and type are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO pokemon (name, type, level) VALUES ($1, $2, $3) RETURNING *",
      [name, type, level || 1]
    );

    await redisClient.del("pokemon:all");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
app.delete("/pokemon/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      "DELETE FROM pokemon WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    await redisClient.del("pokemon:all");
    res.json({ message: "Pokemon released", pokemon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH level
app.patch("/pokemon/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { level } = req.body;

  if (typeof level !== "number" || level < 1 || level > 100) {
    return res.status(400).json({ error: "Level must be between 1 and 100" });
  }

  try {
    const result = await pool.query(
      "UPDATE pokemon SET level = $1 WHERE id = $2 RETURNING *",
      [level, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pokemon not found" });
    }

    await redisClient.del("pokemon:all");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shutdown
process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Pokemon API running on port ${PORT}`);
  console.log(`Container ID: ${os.hostname()}`);
});
