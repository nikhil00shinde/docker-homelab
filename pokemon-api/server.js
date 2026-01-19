const express = require("express");
const os = require("os");

const app = express();
const PORT = 3000;

// Middleware to parse JSON 
app.use(express.json());


let pokemon = [
  {id: 1, name: 'Pikachu', type: 'Electric', level: 25},
  {id: 1, name: 'Charizard', type: 'Fire', level: 50},
  {id: 1, name: 'Blastoise', type: 'Water', level: 48},
];

let nextId = 4;

//Health check endpoint
app.get('/health', (req, res) => {
  res.json({status: 'healthy', 
  timestamp: new Date(),
  container_id: os.hostname()
  });
});


app.get('/stats' , (req, res) => {
  res.json({
    container: {
      name: 'Pokemon API',
      hostname: os.hostname(), // This will be the container ID!
      platform: os.platform(),
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      cpus: os.cpus().length
   },
    pokemon_count: pokemon.length
  });
});


//list all "caught" Pokemon 
app.get('/pokemon', (req, res) => {
  res.json({
    total: pokemon.length,
    data: pokemon
  });
});


app.get('/pokemon/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const found = pokemon.find(p => p.id === id);

  if(!found){
    return res.status(404).json({error: 'Pokemon not found'});
  }

  res.json(found);
});

app.post('/pokemon', (req, res) => {
  const { name, type, level } = req.body;

  if(!name || !type) {
    return res.status(400).json({error: 'Name and types are required'});
  }

  const newPokemon = {
    id: nextId++,
    name,
    type,
    level: level || 1
  }

  pokemon.push(newPokemon);

  res.status(201).json(newPokemon);
});


app.delete('/pokemon/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = pokemon.findIndex(p => p.id === id);
  

  if (index === -1) {
    return res.status(404).json({ error: 'Pokemon not found'});
  }

  const deleted = pokemon.splice(index, 1);
  res.json({ message: 'Pokemon released', pokemon: deleted[0]});
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pokemon API running on port ${PORT}`);
  console.log(`Container ID: ${os.hostname()}`);
});


