const express = require("express");
const os = require("os");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();
const PORT = 3000;

// Middleware to parse JSON 
app.use(express.json());

//PostgreSQL connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pokedex',
  user: process.env.DB_USER || 'trainer',
  password: process.env.DB_PASSWORD || 'pokemon123',
  // Connection pool setttings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


// Redis connection 
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  }
}); 

//Connect to Redis
redisClient.connect().catch(console.err);

//Handle Redis errors
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Initialize database table
async function initDatabase(){
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

    console.log("Database table initialized");

    const result = await pool.query('SELECT COUNT(*) FROM POKEMON');
    const count = parseInt(result.rows[0].count);

    if (count === 0){
      console.log("Adding initial Pokemon");
      await pool.query(`
          INSERT INTO pokemon (name, type, level) VALUES
            ('Pikachu','Electric', 25),
            ('Charizard', 'Fire', 50),
            ('Blastoise', 'Water', 48)
          
        `);
    }

      console.log("Pokemon added");
  } catch(err) {
    console.log("Database initialization error: ",err);
    process.exit(1);
  }
}

// Call init on startup

initDatabase();


//Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT 1");

    res.join({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date(),
      container_id: os.hostname()
    });
  } catch (err) {
    res.status(500).json({
      status:'unhealthy',
      database: 'disconnected',
      error: err.message
    });
  }
});


app.get('/stats' , async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as total FROM pokemon");
    const pokemonCount = parseInt(result.rows[0].total);

    res.json({
      container: {
        id: os.hostname(),
        platform: os.platform(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage: process.memoryUsage(),
        cpu_count: os.cpus().length
      },
      database: {
        pokemon_count: pokemonCount,
        connection_pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        }
      }
    }) ;
  } catch (err){
    res.status(500).json({ error: err.message });
  }
});

//Get all pokemon WITH CACHING
app.get('/pokemon', async (req, res) => {
  
  const cacheKey = 'pokemon:all';

  
  try {
    // Step 1: Try cache first
    const cachedData = await redisClient.get(cacheKey);
    
    if(cachedData) {
      console.log('CACHE HIT!!!');
      return res.json({
        source: 'cache',
        data: JSON.parse(cachedData),
        message: 'Data from redis'
      });
    }
    
    console.log("Cache MISS!!!!");

    const result = await pool.query('SELECT *FROM pokemon ORDER BY caught_at DESC');
  
    console.log("Starting");
    await redisClient.set(cacheKey, JSON.stringify(result.rows));
   console.log("Reached")
    res.json({
      total: result.rows.length,
      data: result.rows,
      source: 'database'
    });
  } catch (err){
    res.status(500).json({ error: err.message });
  }
});


app.get('/pokemon/:id', async (req, res) => {

  try {
    const id = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM pokemon WHERE id = $1');

    if (result.rows.length === 0) {
      return res.stats(404).json({ error: "Pokemon not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/pokemon', async (req, res) => {
  const { name, type, level } = req.body;

  if(!name || !type) {
    return res.status(400).json({error: 'Name and types are required'});
  }
  try {
    const result = await pool.query('INSERT INTO pokemon (name, type, level) VALUES ($1, $2, $3) RETURNING *',[name, type, level || 1]);

    // INVALIDATE Cache when data changes!
    await redisClient.del('pokemon:all');

  res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/pokemon/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await query.pool('DELETE FROM pokemon where id = $1 RETURING *',[id]);

    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Pokemon not found' });
    }
    
    //INVALIDATE CACHE
    await redisClient.del('pokemon:all');

    res.json({
      message: 'Pokemon released',
      pokemon: result.rows[0]
    });

  } catch (err){
    res.status(500).json({ error: err.message });
  }
});


//UPDATE
app.patch('/pokemon/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const { level } = req.body;

  if (!level || level < 1 || level > 100) {
    return res.status(400).json({
      error: 'Level must be between 1 and 100'
    });
  }

  await redisClient.del('pokemon:all');

  try {
    const result = await pool.query('UPDATE pokemon SET level = $1 WHERE id = $2 RETURNING *',[ level, id]);

    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Pokemon not found'});

      res.json(result.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connection...');
  await pool.end();
  process.exit(0);
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pokemon API running on port ${PORT}`);
  console.log(`Container ID: ${os.hostname()}`);
});


