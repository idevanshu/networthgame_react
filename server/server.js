const express = require('express');
const { Web3 } = require('web3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const app = express();
const PORT = process.env.PORT || 3001;

const prisma = new PrismaClient();

// Configure Web3 with Infura using your API key
const infuraUrl = 'https://mainnet.infura.io/v3/8627168fd72846898c561bf658ff262a';
const web3 = new Web3(infuraUrl); // Simplified initialization

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
  const { userId, address } = req.body;
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
      multiplier: user.loginCount
    }));
    userList.sort((a, b) => b.netWorth - a.netWorth);
    res.json(userList);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    res.status(500).send("Error fetching leaderboard data");
  }
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
