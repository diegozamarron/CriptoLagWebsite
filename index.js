import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
app.use(limiter);

app.post("/", async (req, res) => {
  try {
    const response = await fetch(process.env.QUICKNODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Proxy failed" });
  }
});

app.get("/token-info", async (req, res) => {
  const poolAddress = "857wGRbkBN7uAKdsdzop4BCQ8ZPeqKX8x3v6JDPbpSnc"; // CRL pool
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("GeckoTerminal API error:", error);
    res.status(500).json({ error: "Failed to fetch token info" });
  }
});

app.get("/holders", async (req, res) => {
  const mint = req.query.mint;
  if (!mint) {
    return res.status(400).json({ error: "Missing 'mint' query parameter" });
  }

  try {
    const response = await fetch(process.env.QUICKNODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByMint",
        params: [
          mint,
          {
            encoding: "jsonParsed",
            commitment: "confirmed" 
          }
        ]
      })
    });

    const rpcData = await response.json();

    if (!rpcData.result || !rpcData.result.value) {
      return res.status(500).json({ error: "Invalid RPC response" });
    }

    const holders = rpcData.result.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      return amount && amount > 0;
    }).length;

    res.json({ holders });
  } catch (error) {
    console.error("Holders fetch error:", error);
    res.status(500).json({ error: "Failed to fetch holders" });
  }
});


app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
});
