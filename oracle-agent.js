require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

let priceHistory = [];
let alertHistory = [];
let isAgentEnabled = true;

const TOGGLE_PASSWORD = process.env.TOGGLE_PASSWORD || "arc12345";
const ALERT_AMOUNT = 0.02;

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
const RECIPIENT_ALERT = '0xa7519988B2e550548A025A8021226aD4Abe337C6'; // ← Update

let prices = { BTC: 0, ETH: 0, SOL: 0 };
let lastPrices = { BTC: 0, ETH: 0, SOL: 0 };

async function fetchPrices() {
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
    prices.BTC = res.data.bitcoin.usd;
    prices.ETH = res.data.ethereum.usd;
    prices.SOL = res.data.solana.usd;
  } catch (e) {
    // Simulation fallback
    prices.BTC = (prices.BTC || 68000) + (Math.random() * 600 - 300);
    prices.ETH = (prices.ETH || 2450) + (Math.random() * 45 - 22);
    prices.SOL = (prices.SOL || 148) + (Math.random() * 5 - 2.5);
  }
}

async function sendAlert(coin) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(USDC_ADDRESS, ['function transfer(address,uint256)'], wallet);
    await contract.transfer(RECIPIENT_ALERT, ethers.parseUnits(ALERT_AMOUNT.toString(), 6));
    console.log(`🚨 ${coin} ALERT SENT!`);
  } catch (e) {
    console.error("Transfer failed");
  }
}

async function updatePrices() {
  if (!isAgentEnabled) return;

  await fetchPrices();

  ['BTC', 'ETH', 'SOL'].forEach(coin => {
    const current = prices[coin];
    const last = lastPrices[coin] || current;
    const change = last ? ((current - last) / last * 100).toFixed(2) : 0;

    if (last > 0 && Math.abs(change) > 1.5) {
      const direction = change > 0 ? "Up" : "Down";
      const log = {
        time: new Date().toLocaleString(),
        coin,
        direction,
        price: current,
        change,
        action: `Sent ${ALERT_AMOUNT} USDC`
      };
      alertHistory.unshift(log);
      if (alertHistory.length > 12) alertHistory.pop();

      sendAlert(coin);
    }
    lastPrices[coin] = current;
  });

  priceHistory.unshift({ time: new Date().toLocaleString(), ...prices });
  if (priceHistory.length > 15) priceHistory.pop();
}

// Dashboard
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Multi Crypto Oracle</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body { font-family: Arial; padding: 25px; background: #0f172a; color: #e2e8f0; }
          table { border-collapse: collapse; width: 100%; background: #1e2937; }
          th, td { padding: 12px; border: 1px solid #334155; }
          button { padding: 10px 16px; margin: 5px; border: none; border-radius: 6px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>📡 Multi Crypto Oracle Monitor</h1>
        <p><strong>Status:</strong> ${isAgentEnabled ? '🟢 Active' : '🔴 Stopped'}</p>

        <h2>Current Prices</h2>
        <table>
          <tr><th>Coin</th><th>Price</th></tr>
          <tr><td>BTC</td><td>$${prices.BTC?.toFixed(0)}</td></tr>
          <tr><td>ETH</td><td>$${prices.ETH?.toFixed(2)}</td></tr>
          <tr><td>SOL</td><td>$${prices.SOL?.toFixed(2)}</td></tr>
        </table>

        <h2>Alert History (Last 12)</h2>
        <table>
          <tr><th>Time</th><th>Coin</th><th>Direction</th><th>Action</th></tr>
          ${alertHistory.map(a => `
            <tr>
              <td>${a.time}</td>
              <td>${a.coin}</td>
              <td>${a.direction}</td>
              <td>${a.action}</td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top: 30px; padding: 20px; background: #1e2937; border-radius: 8px;">
          <h3>🔐 Admin Controls</h3>
          <form action="/toggle" method="POST">
            <input type="password" name="password" placeholder="Password" required style="padding:8px; width:220px;">
            <button type="submit">Toggle ON/OFF</button>
          </form>
          <br>
          <form action="/force-check" method="POST">
            <button type="submit">Force Update Prices</button>
          </form>
          <br>
          <form action="/force-alert" method="POST">
            <button type="submit" style="background:#ef4444;color:white;">🚨 Force ETH Alert</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post('/toggle', express.urlencoded({ extended: true }), (req, res) => {
  if (req.body.password === TOGGLE_PASSWORD) {
    isAgentEnabled = !isAgentEnabled;
    res.send(`<h2>Agent is now ${isAgentEnabled ? 'ENABLED' : 'DISABLED'}</h2><p><a href="/">← Back</a></p>`);
  } else {
    res.send(`<h2>❌ Wrong password</h2><p><a href="/">← Try again</a></p>`);
  }
});

app.post('/force-check', express.urlencoded({ extended: true }), async (req, res) => {
  await updatePrices();
  res.send(`<h2>✅ Prices updated</h2><p><a href="/">← Back</a></p>`);
});

app.post('/force-alert', express.urlencoded({ extended: true }), async (req, res) => {
  await sendAlert('ETH');
  res.send(`<h2>🚨 Forced ETH Alert Triggered</h2><p><a href="/">← Back</a></p>`);
});

app.listen(PORT, () => {
  console.log(`🌐 Oracle running at http://localhost:${PORT}`);
  updatePrices();
  setInterval(updatePrices, 10000);
});