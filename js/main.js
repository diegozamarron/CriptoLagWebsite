// token variable config
const SOL_MINT = "So11111111111111111111111111111111111111112"; //SOL mint address
const CRL_MINT = "9AtC4cXKs7XUGCsoxPcEuMeig68MJwHpn6LXQCgF19DY"; //CRL mint address
const BACKEND_URL = "https://criptolag.onrender.com"; //backend URL

let publicKey = null;
let balanceInterval = null;

//check if browser is supported
function isSupportedBrowser() {
    const ua = navigator.userAgent;
    return (
        ua.includes("Chrome") ||
        ua.includes("Firefox") ||
        ua.includes("Safari") ||
        ua.includes("Edg")
    );
}

function showWarningModal(message) {
    const modal = document.getElementById("warningModal");
    const modalText = document.getElementById("warningModalText");
    modalText.textContent = message;
    modal.style.display = "flex";
}

function closeWarningModal() {
    document.getElementById("warningModal").style.display = "none";
}

//connect to the phantom wallet browser extension
async function connectWallet() {
    const walletStatus = document.getElementById("walletStatus");
    const connectButton = document.getElementById("connectWallet");
    const disconnectButton = document.getElementById("disconnectWallet");

    walletStatus.textContent = "Connecting...";

    try {
        //detect browser
        const ua = navigator.userAgent;
        const isDesktop = !/Mobi|Android|iPhone|iPad/i.test(ua);
        const isSupportedBrowser = isDesktop && (
            ua.includes("Chrome") ||
            ua.includes("Firefox") ||
            ua.includes("Edg") ||
            ua.includes("OPR") ||  
            ua.includes("Opera")    
        );
        //check if phantom is available
        const phantomAvailable = window.solana && window.solana.isPhantom;

        //show appropriate error message in case of failure
        if (!phantomAvailable && !isSupportedBrowser) {
            throw new Error("Este navegador no es compatible. Porfavor use Chrome, Firefox, Edge o Opera en una computadora de escritorio.");
        }

        if (!phantomAvailable && isSupportedBrowser) {
            throw new Error("Phantom Wallet no encontrada. Por favor, instálala desde https://phantom.app.");
        }
        /connect phantom wallet and update UI
        const provider = window.solana;
        const response = await provider.connect();
        publicKey = response.publicKey;

        walletStatus.textContent = `Connected: ${publicKey.toString()}`;
        connectButton.style.display = "none";
        disconnectButton.style.display = "inline-block";

        if (!window.phantomEventListenersAttached) {
            window.solana.on("connect", onPhantomConnect);
            window.solana.on("disconnect", onPhantomDisconnect);
            window.phantomEventListenersAttached = true;
        }

        //display balances
        await displaySolBalance();
        await displayTokenBalance(CRL_MINT);

        //update balances every 5 seconds
        if (balanceInterval) clearInterval(balanceInterval);
        balanceInterval = setInterval(() => {
            if (publicKey) {
                displaySolBalance();
                displayTokenBalance(CRL_MINT);
            }
        }, 5000);

    } catch (err) {
        console.error("Connection error:", err);
        walletStatus.textContent = err.message;
        alert(err.message);

        connectButton.style.display = "inline-block";
        disconnectButton.style.display = "none";
    } finally {
        connectButton.disabled = publicKey !== null;
        disconnectButton.disabled = publicKey === null;
    }
}


//disconnect phantom wallet and clear the balances
async function disconnectWallet() {
    const walletStatus = document.getElementById("walletStatus");
    const connectButton = document.getElementById("connectWallet");
    const disconnectButton = document.getElementById("disconnectWallet");
    const SOLbal = document.getElementById("SOLbal");
    const CRLbal = document.getElementById("CRLbal");
    
    connectButton.style.display = "inline-block";
    disconnectButton.style.display = "none";

    walletStatus.textContent = "Disconnecting...";
 
    try {
        //stop refreshing balances
        if (balanceInterval) {
            clearInterval(balanceInterval);
            balanceInterval = null;
        }        
        if (!window.solana) throw new Error("Phantom Wallet not found.");
        await window.solana.disconnect();
        onPhantomDisconnect();
        SOLbal.textContent = "SOL Balance: N/A";
        CRLbal.textContent = "CRL Balance: N/A";
    } catch (error) {
        console.error("Disconnection failed:", error);
        walletStatus.textContent = `Disconnection Failed: ${error.message}`;
    } finally {
        connectButton.style.display = "inline-block";
        disconnectButton.style.display = "none";
    }
}

//update UI on phantom connect
function onPhantomConnect(newPublicKey) {
    publicKey = newPublicKey;
    const walletStatus = document.getElementById("walletStatus");
    const connectButton = document.getElementById("connectWallet");
    const disconnectButton = document.getElementById("disconnectWallet");

    walletStatus.textContent = `Connected: ${publicKey.toString()}`;
    connectButton.style.display = "none";
    disconnectButton.style.display = "inline-block";

    displaySolBalance();
    displayTokenBalance(CRL_MINT);
}

//update UI when phantom disconnects
function onPhantomDisconnect() {
    publicKey = null;
    const walletStatus = document.getElementById("walletStatus");
    const connectButton = document.getElementById("connectWallet");
    const disconnectButton = document.getElementById("disconnectWallet");
    const SOLbal = document.getElementById("SOLbal");
    const CRLbal = document.getElementById("CRLbal");

    walletStatus.textContent = "Not connected";
    connectButton.style.display = "inline-block";
    disconnectButton.style.display = "none";
    
    SOLbal.textContent = "SOL Balance: N/A";
    CRLbal.textContent = "CRL Balance: N/A";
}

//fetch SOL balance for connected wallet
async function displaySolBalance() {
    const SOLbal = document.getElementById("SOLbal");

    if (!publicKey) {
        SOLbal.textContent = "Balance: Not connected";
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getBalance",
                params: [publicKey.toString()]
            })
        });

        const result = await response.json();
        const lamports = result.result.value;
        const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
        SOLbal.textContent = `SOL Balance: ${solBalance.toFixed(4)}`;
    } catch (error) {
        console.error("Error fetching SOL balance:", error);
        SOLbal.textContent = "SOL Balance: Error fetching balance";
    }
}

//fetch CRL balance for connected wallet
async function displayTokenBalance(tokenMintAddress) {
    const CRLbal = document.getElementById("CRLbal");

    if (!publicKey) {
        CRLbal.textContent = "Balance: Not connected";
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTokenAccountsByOwner",
                params: [
                    publicKey.toString(),
                    { mint: tokenMintAddress },
                    { encoding: "jsonParsed" }
                ]
            })
        });

        const result = await response.json();
        const accounts = result.result.value;

        if (accounts.length === 0) {
            CRLbal.textContent = "CRL Balance: 0.0000";
            return;
        }

        const rawData = accounts[0].account.data;
        const amount = rawData.parsed.info.tokenAmount.uiAmount;
        CRLbal.textContent = `CRL Balance: ${amount.toFixed(4)}`;
    } catch (error) {
        console.error("Error fetching CRL balance:", error);
        CRLbal.textContent = "CRL Balance: Error fetching balance";
    }
}

//fetch token info
async function fetchTokenInfo() {
    try {
        const response = await fetch(`${BACKEND_URL}/token-info`);
        const data = await response.json();
        const poolData = data.data.attributes;

        const price = poolData.base_token_price_usd;
        const liquidity = poolData.reserve_in_usd;
        const marketCap = poolData.fdv_usd;

        document.getElementById("Price").textContent = `$${parseFloat(price).toFixed(6)}`;
        document.getElementById("Liquidity").textContent = `$${parseFloat(liquidity).toLocaleString()}`;
        document.getElementById("marketCap").textContent = `$${parseFloat(marketCap).toLocaleString()}`;
        document.getElementById("projectPrice").textContent = `$${parseFloat(marketCap).toLocaleString()}`;
    } catch (error) {
        console.error("Error fetching token info:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const connectButton = document.getElementById("connectWallet");
    const disconnectButton = document.getElementById("disconnectWallet");

    connectButton.addEventListener("click", connectWallet);
    disconnectButton.addEventListener("click", disconnectWallet);

    disconnectButton.disabled = true;


    fetchTokenInfo();
});



