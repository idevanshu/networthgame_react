const express = require('express');
const {Web3} = require('web3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS options to allow all domains
const corsOptions = {
    origin: (origin, callback) => callback(null, true), // Allow all origins
    optionsSuccessStatus: 200,
    methods: "GET, POST, PUT, DELETE",
    credentials: true
};

app.use(cors(corsOptions)); // Apply CORS globally with specified options

// Remaining initializations
const prisma = new PrismaClient();
const redis = new Redis(); // Connects to 127.0.0.1:6379 by default

// Configure Web3 with Infura using your API key
const infuraUrl = process.env.INFURA_URL || 'https://mainnet.infura.io/v3/8627168fd72846898c561bf658ff262a';
const web3 = new Web3(infuraUrl);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Generate a user name based on the Ethereum address
function generateUserName(address) {
  return `User${address.slice(2, 6)}`; // Take part of the address and prepend 'User'
}

// API endpoint to receive user data
app.post('/api/userdata', async (req, res) => {
  const { address } = req.body;
  const name = generateUserName(address);

  try {
    // Check cache first
    let userCache = await redis.get(address);
    if (userCache) {
      userCache = JSON.parse(userCache);
      res.json(userCache);
      return;
    }

    const balance = await web3.eth.getBalance(address);
    const ethHoldings = web3.utils.fromWei(balance, 'ether');
    
    let user = await prisma.user.findUnique({
      where: { address }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address,
          name,
          ethHoldings: parseFloat(ethHoldings),
          loginCount: 1,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { address },
        data: {
          ethHoldings: parseFloat(ethHoldings),
          loginCount: user.loginCount + 1,
        },
      });
    }

    const multiplier = user.loginCount;
    const netWorth = user.ethHoldings * multiplier;

    // Cache the result
    await redis.set(address, JSON.stringify({ name, netWorth, multiplier }), 'EX', 3600); // Expires in 1 hour

    res.json({ name, netWorth, multiplier });
  } catch (error) {
    console.error("Error fetching ETH balance or updating database:", error);
    res.status(500).send("Error fetching wallet information or updating database");
  }
});

// Route to provide the leaderboard data as JSON
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const userList = users.map(user => ({
      name: user.name,
      netWorth: user.ethHoldings * user.loginCount,
      multiplier: user.loginNcount
    }));
    userList.sort((a, b) => b.netWorth - a.netWorth);
    res.json(userList);
  } catch (error) {
     console.error("Error fetching leaderboard data:", error);
     res.status(500). send("Error fetching leaderboard data");
  }
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
