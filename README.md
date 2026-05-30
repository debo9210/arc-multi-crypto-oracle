# 📡 Arc Multi Crypto Price Oracle Monitor

A real-time price monitoring agent for **BTC, ETH, and SOL** built on **Arc testnet**.

## Overview

This autonomous agent fetches live prices from CoinGecko, monitors percentage changes, and sends **USDC alerts** to a recipient wallet when prices cross defined thresholds.

Perfect demonstration of **agentic behavior**: continuous monitoring + autonomous on-chain action.

## Features

- Real-time prices for **BTC, ETH, and SOL**
- Automatic USDC alert transfers when price moves ±5%
- Live dashboard with price history
- Dedicated **Alert History** log
- Password-protected ON/OFF toggle
- Manual "Force Update" button
- Live wallet balance display

## Live Demo

**https://arc-multi-crypto-oracle.onrender.com**

## Tech Stack

- Node.js + Express
- ethers.js
- CoinGecko API
- Arc Testnet (USDC as native gas)
- Deployed on Render.com

## Screenshots

*(Add screenshots of your dashboard here after deployment)*

## Setup (Local Development)

```bash
npm install
node oracle-agent.js


