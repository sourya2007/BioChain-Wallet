const state = {
  profile: null,
  wallet: null,
  connectionToken: null,
  trust: null,
};

const profileEl = document.getElementById("activeProfile");
const walletEl = document.getElementById("activeWallet");
const tokenEl = document.getElementById("connectionToken");
const trustEl = document.getElementById("trustZone");
const addressEl = document.getElementById("walletAddress");
const scanEl = document.getElementById("scanKey");
const spendEl = document.getElementById("spendKey");
const apiStatusEl = document.getElementById("apiStatus");

const logList = document.getElementById("processLog");
const logTemplate = document.getElementById("logTemplate");

function nowTime() {
  return new Date().toLocaleTimeString();
}

function logProcess(tag, text, data) {
  const node = logTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".log-time").textContent = nowTime();
  node.querySelector(".log-tag").textContent = tag;
  node.querySelector(".log-text").textContent = text;

  const dataEl = node.querySelector(".log-data");
  if (data === undefined || data === null || data === "") {
    dataEl.remove();
  } else if (typeof data === "string") {
    dataEl.textContent = data;
  } else {
    dataEl.textContent = JSON.stringify(data, null, 2);
  }

  logList.prepend(node);
}

function updateDashboard() {
  profileEl.textContent = state.profile ? `${state.profile.profile_name} (${state.profile.profile_id})` : "-";
  walletEl.textContent = state.wallet?.wallet_id || "-";
  tokenEl.textContent = state.connectionToken || "-";
  trustEl.textContent = state.trust ? `${state.trust.zone} | ${state.trust.action}` : "-";
  addressEl.textContent = state.wallet?.current_address || "-";
  scanEl.textContent = state.wallet?.scan_public_key || "-";
  spendEl.textContent = state.wallet?.spend_public_key || "-";
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function api(path, payload, method = "POST") {
  const start = performance.now();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(payload),
  });

  const ms = Math.round(performance.now() - start);
  let body = null;

  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message = body?.detail || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  logProcess("API", `${method} ${path} completed in ${ms}ms`, body);
  return body;
}

function formToObj(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function parseShardInput(value) {
  if (!value || !value.includes(":")) {
    return null;
  }
  const [k, ...rest] = value.split(":");
  const v = rest.join(":").trim();
  if (!k.trim() || !v) {
    return null;
  }
  return { k: k.trim(), v };
}

async function checkApi() {
  try {
    const res = await fetch("/");
    const body = await res.json();
    apiStatusEl.textContent = `API: online (${body.status})`;
    logProcess("BOOT", "Backend healthcheck passed", body);
  } catch (err) {
    apiStatusEl.textContent = "API: offline";
    apiStatusEl.style.color = "var(--danger)";
    logProcess("BOOT", "Backend healthcheck failed", String(err));
  }
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const bodies = Array.from(document.querySelectorAll(".tab-body"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      bodies.forEach((b) => b.classList.remove("active"));
      tab.classList.add("active");
      const pane = document.getElementById(`tab-${tab.dataset.tab}`);
      pane.classList.add("active");
    });
  });
}

async function setupForms() {
  document.getElementById("profileCreateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    logProcess("HASH", "Hashing DNA source before profile creation", { source: data.dna_raw });
    const dnaCommitment = await sha256Hex(data.dna_raw);
    logProcess("HASH", "DNA commitment computed (SHA-256)", dnaCommitment);

    const payload = { profile_name: data.profile_name, dna_commitment: dnaCommitment };

    try {
      const result = await api("/profiles", payload);
      state.profile = result;
      updateDashboard();
      logProcess("PROFILE", "Profile created", result);
    } catch (err) {
      logProcess("ERROR", "Profile creation failed", String(err));
    }
  });

  document.getElementById("walletCreateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    const payload = {
      profile_id: data.profile_id,
      currency: data.currency,
      home_latitude: Number(data.home_latitude),
      home_longitude: Number(data.home_longitude),
      device_fingerprint: data.device_fingerprint,
    };

    try {
      const result = await api("/wallets/currency", payload);
      state.wallet = result;
      updateDashboard();
      logProcess("WALLET", "Currency wallet bound to profile", {
        wallet_id: result.wallet_id,
        currency: result.currency,
        derived_address: result.current_address,
      });
    } catch (err) {
      logProcess("ERROR", "Wallet creation failed", String(err));
    }
  });

  document.getElementById("connectWalletForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    logProcess("HASH", "Hashing DNA source for wallet login", { source: data.dna_raw });
    const dnaCommitment = await sha256Hex(data.dna_raw);
    logProcess("HASH", "Login DNA commitment computed", dnaCommitment);

    const payload = {
      profile_id: data.profile_id,
      wallet_id: data.wallet_id,
      dna_commitment: dnaCommitment,
    };

    try {
      const result = await api("/wallets/connect", payload);
      if (result.connected) {
        state.connectionToken = result.connection_token;
      }
      updateDashboard();
      logProcess("AUTH", result.message, result);
    } catch (err) {
      logProcess("ERROR", "Wallet connect failed", String(err));
    }
  });

  document.getElementById("secureSendForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    const payload = {
      connection_token: data.connection_token,
      sender_wallet_id: data.sender_wallet_id,
      receiver: {
        scan_public_key: data.scan_public_key,
        spend_public_key: data.spend_public_key,
      },
      amount: Number(data.amount),
      memo: data.memo || null,
      decoy_count: Number(data.decoy_count),
    };

    try {
      const result = await api("/transactions/send-secure", payload);
      logProcess("TX", "Secure transaction sent with stealth + rotation", {
        tx_id: result.tx_id,
        rotated_sender_address: result.rotated_sender_address,
        stealth_destination_address: result.stealth_destination_address,
        ephemeral_pub: result.sender_ephemeral_pub,
        decoy_count: result.decoys?.length || 0,
      });
    } catch (err) {
      logProcess("ERROR", "Secure send failed", String(err));
    }
  });

  document.getElementById("trustForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    const payload = {
      wallet_id: data.wallet_id,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      device_fingerprint: data.device_fingerprint,
      dna_reauth_passed: data.dna_reauth_passed === "true",
    };

    try {
      const result = await api("/trust/evaluate", payload);
      state.trust = result;
      updateDashboard();
      logProcess("TRUST", "Geo-genomic trust policy evaluated", result);
    } catch (err) {
      logProcess("ERROR", "Trust evaluation failed", String(err));
    }
  });

  document.getElementById("zkForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    const payload = {
      wallet_id: data.wallet_id,
      proof: data.proof,
      public_signal: data.public_signal,
    };

    try {
      const result = await api("/dna/verify-zk", payload);
      logProcess("ZK", `ZK DNA proof validity: ${result.valid}`, result);
    } catch (err) {
      logProcess("ERROR", "ZK verification failed", String(err));
    }
  });

  document.getElementById("shardCreateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    try {
      const result = await api("/shards/create", { wallet_id: data.wallet_id });
      logProcess("SHARD", "DNA shard locations generated", result);
    } catch (err) {
      logProcess("ERROR", "Shard creation failed", String(err));
    }
  });

  document.getElementById("shardRecoverForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = formToObj(e.currentTarget);

    const shards = {};
    [data.s1, data.s2, data.s3].forEach((raw) => {
      const item = parseShardInput(raw);
      if (item) {
        shards[item.k] = item.v;
      }
    });

    const payload = {
      wallet_id: data.wallet_id,
      available_shards: shards,
      dna_scan_present: data.dna_scan_present === "true",
    };

    try {
      const result = await api("/shards/recover", payload);
      logProcess("RECOVERY", "Root key recovered from shards", result);
    } catch (err) {
      logProcess("ERROR", "Shard recovery failed", String(err));
    }
  });

  document.getElementById("runDecoy").addEventListener("click", async () => {
    try {
      const result = await api("/decoys/broadcast", null, "GET");
      logProcess("DECOY", "Periodic decoy broadcast triggered", result);
    } catch (err) {
      logProcess("ERROR", "Decoy broadcast failed", String(err));
    }
  });
}

setupTabs();
setupForms();
checkApi();
updateDashboard();
