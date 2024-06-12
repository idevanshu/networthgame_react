const express = require('express');
const { Web3 } = require('web3');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();

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

function generateUserName(address) {
  return `User${address.slice(2, 6)}`;
}

app.post('/api/userdata', async (req, res) => {
  const { address } = req.body;
  const name = generateUserName(address);

  try {
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

    await redis.set(address, JSON.stringify({ name, netWorth, multiplier }), 'EX', 3600);

    res.json({ name, netWorth, multiplier });
  } catch (error) {
    console.error("Error fetching ETH balance or updating database:", error);
    res.status(500).send("Error fetching wallet information or updating database");
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const userList = users.map(user => ({
      name: user.name,
      netWorth: user.ethHoldings * user.loginCount,
      multiplier: user.loginCount
    }));
    userList.sort((a, b) => b.netWorth - a.netWorth);
    res.json(userList);
  } catch (error) {
     console.error("Error fetching leaderboard data:", error);
     res.status(500).send("Error fetching leaderboard data");
  }
});

module.exports = app;
