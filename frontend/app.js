// ===== PWA: register service worker =====

console.log('✓ app.js loaded successfully');

if ('serviceWorker' in navigator) {

  window.addEventListener('load', () => {

    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW registration failed', err));

  });

}


// ===== Global state =====
let lastRecords = [];       // latest fetched live records
let predictionChart = null; // Chart.js instance


// ===== Utilities =====
function showMessage(text) {
  const msg = document.getElementById('login-message');
  msg.textContent = text;
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 4200);
}

function parsePrice(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function getCachedCropName() {
  try {
    const cached = localStorage.getItem('lastPrices');
    if (!cached) return 'Crop';
    const payload = JSON.parse(cached);
    return payload.crop || 'Crop';
  } catch (err) {
    return 'Crop';
  }
}

function updateDashboardInsights(predictions) {
  const alertPreview = document.getElementById('alert-preview');
  const bestDayPreview = document.getElementById('best-day-preview');
  if (!alertPreview || !bestDayPreview) return;

  if (!predictions || !predictions.length) {
    alertPreview.innerHTML = '<span style="font-style: italic;">Generate predictions to see alerts...</span>';
    bestDayPreview.innerHTML = '<span style="font-style: italic;">Generate predictions to see best day...</span>';
    return;
  }

  const crop = getCachedCropName();
  const firstPrice = predictions[0].price;
  const minPrediction = predictions.reduce((min, p) => p.price < min.price ? p : min, predictions[0]);
  const maxPrediction = predictions.reduce((max, p) => p.price > max.price ? p : max, predictions[0]);
  const trend = maxPrediction.price - firstPrice;
  const dropPercent = firstPrice > 0 ? Math.round(((firstPrice - minPrediction.price) / firstPrice) * 100) : 0;
  const hasDrop = minPrediction.price < firstPrice;

  let alertText = `No significant drop predicted for ${crop}. Prices appear stable in the next 7 days.`;
  if (hasDrop) {
    alertText = `⚠️ ${crop} prices may drop to ₹${minPrediction.price} on ${minPrediction.date} before recovering.`;
    if (dropPercent >= 15) {
      alertText += ' Consider selling before the dip if you need cash soon.';
    } else {
      alertText += ' Plan to avoid the lowest day if possible.';
    }
  }

  alertPreview.innerHTML = alertText;
  bestDayPreview.innerHTML = `Best day to sell: ${maxPrediction.date} at ₹${maxPrediction.price}.`;
}

// Login Modal
function openLogin() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    console.error('Login modal not found');
  }
}
function closeLogin() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'none';
  const msg = document.getElementById('login-message');
  if (msg) msg.style.display = 'none';
}

// Signup Modal
function openSignup() {
  const modal = document.getElementById('signup-modal');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    console.error('Signup modal not found');
  }
}
function closeSignup() {
  const modal = document.getElementById('signup-modal');
  if (modal) modal.style.display = 'none';
  const msg = document.getElementById('login-message');
  if (msg) msg.style.display = 'none';
}

// Forgot Password Modal (Paste here)
function openForgotPassword() {
  document.getElementById("forgot-password-modal").style.display = "flex";
}
function closeForgotPassword() {
  document.getElementById("forgot-password-modal").style.display = "none";
}
// Close when clicking outside modal
window.addEventListener("click", (event) => {
  const modal = document.getElementById("forgot-password-modal");
  if (event.target === modal) {
    closeForgotPassword();
  }
});

// Send Reset Email Backend API
function sendResetLink() {
  const email = document.getElementById("reset-email").value.trim();

  if (!email) {
    alert("Please enter your email!");
    return;
  }

  fetch("http://localhost:5000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        const message = data.debugLink 
          ? `✓ ${data.message}\n\nDebug Link (for development):\n${data.debugLink}` 
          : data.message;
        alert(message);
        closeForgotPassword();
      } else {
        alert(data.message || "Failed to send reset link");
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      alert(`Error: ${error.message}. Make sure the backend is running on port 5000.`);
    });
}

// ===== (Duplicate block removed - functions defined above) =====

function login() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if (!user || !pass) { showMessage('Enter username and password'); return; }
  
  // Store login state
  localStorage.setItem('loggedInUser', user);
  
  showMessage('Login successful');
  closeLogin();
  updateProfileDisplay(user);
}

function signup() {
  const user = document.getElementById('signup-user').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const phone = document.getElementById('signup-mobile').value.trim();
  const pass = document.getElementById('signup-pass').value.trim();
  if (!user || !pass || !email || !phone) { showMessage('Please fill all fields'); return; }
  
  // Store login state
  localStorage.setItem('loggedInUser', user);
  
  showMessage('Signup successful');
  closeSignup();
  updateProfileDisplay(user);
}

// ===== Profile Management =====
function updateProfileDisplay(username) {
  const loginBtn = document.querySelector('.login-btn');
  const signupBtn = document.querySelector('.signup-btn');
  const profileBox = document.getElementById('profile-box');
  const profileIcon = document.getElementById('profile-icon');
  const userProfileCard = document.getElementById('user-profile-card');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  
  // Hide login/signup buttons
  if (loginBtn) loginBtn.style.display = 'none';
  if (signupBtn) signupBtn.style.display = 'none';
  
  // Show profile box in header with user initial
  if (profileBox && profileIcon) {
    profileBox.style.display = 'block';
    const initial = username.charAt(0).toUpperCase();
    profileIcon.textContent = initial;
    profileIcon.title = username;
  }
  
  // Show profile card in dashboard
  if (userProfileCard && userAvatar && userName) {
    userProfileCard.style.display = 'block';
    const initial = username.charAt(0).toUpperCase();
    userAvatar.textContent = initial;
    userName.textContent = username;
  }
}

function toggleProfileMenu() {
  const profileMenu = document.getElementById('profile-menu');
  profileMenu.classList.toggle('show');
}

function logout() {
  localStorage.removeItem('loggedInUser');
  showMessage('Logged out successfully');
  
  const loginBtn = document.querySelector('.login-btn');
  const signupBtn = document.querySelector('.signup-btn');
  const profileBox = document.getElementById('profile-box');
  const profileMenu = document.getElementById('profile-menu');
  const userProfileCard = document.getElementById('user-profile-card');
  
  // Show login/signup buttons
  if (loginBtn) loginBtn.style.display = 'block';
  if (signupBtn) signupBtn.style.display = 'block';
  
  // Hide profile box
  if (profileBox) profileBox.style.display = 'none';
  if (profileMenu) profileMenu.classList.remove('show');
  
  // Hide profile card in dashboard
  if (userProfileCard) userProfileCard.style.display = 'none';
}

function openChangePassword() {
  alert('Change password feature coming soon!');
}

function closeUserProfile() {
  const userProfileCard = document.getElementById('user-profile-card');
  if (userProfileCard) userProfileCard.style.display = 'none';
}

// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
  // Always hide all profile elements on page load
  const profileBox = document.getElementById('profile-box');
  if (profileBox) profileBox.style.display = 'none';
  
  const profileMenu = document.getElementById('profile-menu');
  if (profileMenu) profileMenu.classList.remove('show');
  
  const userProfileCard = document.getElementById('user-profile-card');
  if (userProfileCard) userProfileCard.style.display = 'none';
  
  const loggedInUser = localStorage.getItem('loggedInUser');
  if (loggedInUser) {
    updateProfileDisplay(loggedInUser);
  }

  const cachedPred = localStorage.getItem('lastPredictions');
  if (cachedPred) {
    try {
      const parsed = JSON.parse(cachedPred);
      updateDashboardInsights(parsed.predictions || []);
    } catch (error) {
      console.warn('Unable to parse cached predictions:', error);
    }
  }
});

// ===== Live prices (Agmarknet) =====
async function fetchLivePrices() {
  const crop = document.getElementById("crop-input").value.trim();
  const state = document.getElementById("state-input").value.trim();
  const tableBody = document.querySelector("#prices-table tbody");
  const sourceBadge = document.getElementById("source-badge");

  if (!crop || !state) {
    alert("Please enter both crop and state.");
    return;
  }

  tableBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

  const apiKey = '579b464db66ec23bdd0000016e7d5e3c5bef41f75baf0de6a8d3c9d5';
  const baseUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

  const url = `${baseUrl}?api-key=${apiKey}&format=json&filters[commodity]=${encodeURIComponent(crop)}&filters[state]=${encodeURIComponent(state)}&limit=50`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    tableBody.innerHTML = "";

    if (data.records && data.records.length > 0) {
      const rows = data.records.map(r => ({
        market: r.market || r.market_center || r.market_name || '—',
        district: r.district || r.district_name || '—',
        modal_price: r.modal_price || r.modal || r.price || r.min_price || '—',
        date: r.arrival_date || r.date || r.timestamp || '—',
      }));

      rows.forEach(record => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${record.market}</td>
          <td>${record.district}</td>
          <td>${record.modal_price}</td>
          <td>${record.date}</td>
        `;
        tableBody.appendChild(row);
      });

      sourceBadge.innerText = "Source: Agmarknet";
      lastRecords = rows;

      const cachePayload = { ts: Date.now(), crop, state, rows };
      localStorage.setItem("lastPrices", JSON.stringify(cachePayload));
    } else {
      tableBody.innerHTML = "<tr><td colspan='4'>No data found for selected crop and state.</td></tr>";
    }

  } catch (error) {
    console.error("Error fetching prices:", error);
    tableBody.innerHTML = "<tr><td colspan='4'>Error fetching data. Trying offline cache...</td></tr>";

    const cachedRaw = localStorage.getItem("lastPrices");
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      tableBody.innerHTML = "";
      cached.rows.forEach(record => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${record.market}</td>
          <td>${record.district}</td>
          <td>${record.modal_price}</td>
          <td>${record.date}</td>
        `;
        tableBody.appendChild(row);
      });
      sourceBadge.innerText = "Source: Cached (Offline)";
      lastRecords = cached.rows;
    }
  }
}


// ===== Prediction logic (7 days, table + chart + guidance) =====
function predictPrices() {
  const tableBody = document.querySelector("#prediction-table tbody");
  const guidance = document.getElementById("guidance-text");
  const chartCanvas = document.getElementById("prediction-chart");

  tableBody.innerHTML = "";
  guidance.textContent = "";

  if (!lastRecords || lastRecords.length === 0) {
    const cachedRaw = localStorage.getItem("lastPrices");
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      lastRecords = cached.rows || [];
    }
  }

  if (lastRecords.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='2'>No recent price data. Fetch prices first.</td></tr>";
    return;
  }

  const clean = lastRecords
    .map(r => ({
      price: parsePrice(r.modal_price),
      date: r.date
    }))
    .filter(r => r.price !== null);

  if (clean.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='2'>No numeric price data available.</td></tr>";
    return;
  }

  clean.sort((a, b) => {
    const da = Date.parse(a.date);
    const db = Date.parse(b.date);
    if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
    return 0;
  });

  const N = Math.min(7, clean.length);
  const recent = clean.slice(-N);
  const prices = recent.map(r => r.price);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const trend = (prices[prices.length - 1] - prices[0]) / Math.max(1, (prices.length - 1));
  const alpha = 0.4;

  const predictions = [];
  let last = prices[prices.length - 1];
  let dateCursor = new Date();
  dateCursor.setDate(dateCursor.getDate() + 1);

  for (let i = 0; i < 7; i++) {
    const rawNext = last + trend;
    const smoothed = alpha * rawNext + (1 - alpha) * avg;
    const final = Math.max(0, Math.round(smoothed));

    predictions.push({
      date: formatDateISO(dateCursor),
      price: final
    });

    last = smoothed;
    dateCursor.setDate(dateCursor.getDate() + 1);
  }

  predictions.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.date}</td><td>${p.price}</td>`;
    tableBody.appendChild(tr);
  });

  const startPred = predictions[0].price;
  const endPred = predictions[predictions.length - 1].price;
  const change = endPred - startPred;
  const pct = startPred > 0 ? Math.round((change / startPred) * 100) : 0;

  if (change > 0) {
    guidance.textContent = `Prices are rising by ~${pct}% over a week — consider selling sooner to capture higher rates.`;
  } else if (change < 0) {
    guidance.textContent = `Prices may decline by ~${Math.abs(pct)}% — consider holding or negotiating better terms if possible.`;
  } else {
    guidance.textContent = `Prices look stable this week — sell based on logistics and cash needs.`;
  }

  const labels = predictions.map(p => p.date);
  const values = predictions.map(p => p.price);

  if (predictionChart) {
    predictionChart.destroy();
  }

  predictionChart = new Chart(chartCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Predicted Modal Price (₹)',
          data: values,
          borderColor: '#2c7a7b',
          backgroundColor: 'rgba(44, 122, 123, 0.15)',
          tension: 0.25,
          fill: true,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: '₹' }, beginAtZero: false }
      }
    }
  });

  localStorage.setItem('lastPredictions', JSON.stringify({ ts: Date.now(), predictions }));
  updateDashboardInsights(predictions);
}



// ===== Chat + Dashboard Integration (No duplicate definitions) =====
const CHATBOT_API_BASE = 'http://localhost:5000/api';

/**
 * Fetch live prices from agri-chatbot backend
 * Supports crop name like 'cotton' and location like 'karimnagar'
 */
async function fetchPricesFromChatbot(crop = 'cotton', location = 'karimnagar') {
  try {
    const response = await fetch(`${CHATBOT_API_BASE}/prices?crop=${encodeURIComponent(crop)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    return data; // { crop, currentPrice, prices, predictions, source }
  } catch (error) {
    console.error('Chatbot price API error:', error);
    return null;
  }
}

/**
 * Display live prices and 7-day predictions on dashboard
 */
async function displayLivePricesAndPredictions(crop = 'cotton', location = 'karimnagar') {
  const tableBody = document.querySelector('#prices-table tbody');
  const predTableBody = document.querySelector('#prediction-table tbody');
  const guidance = document.getElementById('guidance-text');
  const sourceBadge = document.getElementById('source-badge');

  if (!tableBody || !predTableBody) return; // Elements may not exist on all pages

  tableBody.innerHTML = '<tr><td colspan="4">Loading prices...</td></tr>';
  predTableBody.innerHTML = '<tr><td colspan="2">Loading predictions...</td></tr>';

  const priceData = await fetchPricesFromChatbot(crop, location);

  if (!priceData) {
    tableBody.innerHTML = '<tr><td colspan="4">⚠️ Could not fetch prices. Check if backend is running.</td></tr>';
    predTableBody.innerHTML = '<tr><td colspan="2">Could not fetch predictions.</td></tr>';
    return;
  }

  // Display current prices
  tableBody.innerHTML = '';
  if (priceData.prices && priceData.prices.length > 0) {
    priceData.prices.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.market || 'N/A'}</td>
        <td>${priceData.location || 'N/A'}</td>
        <td>₹${p.price || 'N/A'}</td>
        <td>${new Date().toLocaleDateString()}</td>
      `;
      tableBody.appendChild(row);
    });
  } else {
    tableBody.innerHTML = '<tr><td colspan="4">No price data available.</td></tr>';
  }

  // Display 7-day predictions
  predTableBody.innerHTML = '';
  if (priceData.predictions && priceData.predictions.length > 0) {
    priceData.predictions.forEach(pred => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${pred.date}</td>
        <td>₹${pred.predictedPrice} <span>${pred.trend}</span></td>
      `;
      predTableBody.appendChild(row);
    });

    // Compute and display guidance
    const firstPrice = priceData.predictions[0].predictedPrice;
    const lastPrice = priceData.predictions[priceData.predictions.length - 1].predictedPrice;
    const change = lastPrice - firstPrice;
    const pct = firstPrice > 0 ? Math.round((change / firstPrice) * 100) : 0;

    if (guidance) {
      if (change > 0) {
        guidance.textContent = `📈 Prices are predicted to rise by ~${pct}% over 7 days — consider selling sooner to capture higher rates.`;
      } else if (change < 0) {
        guidance.textContent = `📉 Prices may decline by ~${Math.abs(pct)}% — consider holding or negotiating better terms if possible.`;
      } else {
        guidance.textContent = `➡️ Prices look stable — sell based on logistics and cash needs.`;
      }
    }
  } else {
    predTableBody.innerHTML = '<tr><td colspan="2">No prediction data available.</td></tr>';
  }

  if (sourceBadge) {
    sourceBadge.innerText = `Source: ${priceData.source || 'mock'}`;
  }
}

/**
 * Auto-fetch prices on page load if dashboard exists
 */
// Removed auto-fetch on load — prices will update only when requested via chatbot or user action

function openChangePassword() {
  alert("Change Password — coming soon!");
}

// ===== Sidebar toggle =====
(function () {
  const toggleBtn = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
})();
// ===== Weather Fetch =====
async function fetchWeather() {
  const place = document.getElementById("weather-location").value;
  const apiKey = "94c55a7086df4d0e9a6160719252309"; // ← your key here

  if (!place) {
    document.getElementById("weather-result").innerHTML =
      "<p style='color:red;'>Please enter a location</p>";
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${place}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    document.getElementById("weather-result").innerHTML = `
      <h3>${data.name}</h3>
      <p>🌡 Temperature: ${data.main.temp} °C</p>
      <p>☁ Condition: ${data.weather[0].description}</p>
      <p>💧 Humidity: ${data.main.humidity}%</p>
      <p>🌬 Wind: ${data.wind.speed} km/h</p>
    `;
  } catch (err) {
    document.getElementById("weather-result").innerHTML =
      "<p style='color:red;'>Location not found!</p>";
  }
}
//new chatbot
// ===== Initialize Chatbot when DOM is ready =====
function initChatbot() {
  // ===== Elements =====
  const chatbotIcon = document.getElementById("chatbotIcon");
  const chatContainer = document.getElementById("chatContainer");
  const closeBtn = document.getElementById("closeBtn");
  const messages = document.getElementById("messages");
  const textInput = document.getElementById("textInput");
  const sendBtn = document.getElementById("sendBtn");
  const languageSelect = document.getElementById("languageSelect");
}

// ===== Language Strings =====
const langText = {
  en: {
    header: "Farmer Chatbot",
    placeholder: "Type message...",
    sendBtn: "➤",
    greeting: "Hi! Ask me about crop prices, farming advice, or anything else.",
    processing: "⏳ Processing..."
  },
  hi: {
    header: "किसान चैटबोट",
    placeholder: "संदेश लिखें...",
    sendBtn: "➤",
    greeting: "नमस्ते! फसल की कीमतों, कृषि सलाह के बारे में पूछें।",
    processing: "⏳ प्रोसेस हो रहा है..."
  },
  te: {
    header: "వ్యవసాయ చాట్‌బాట్",
    placeholder: "సందేశం టైప్ చేయండి...",
    sendBtn: "➤",
    greeting: "హాయ్! పంట ధరలు, వ్యవసాయ సలహాలు గురించి అడగండి.",
    processing: "⏳ ప్రాసెసింగ్..."
  }
};

// ===== Helper Functions =====
function addMessage(text, sender="bot") {
  const div = document.createElement("div");
  div.style.margin = "6px 0";
  div.style.padding = "10px";
  div.style.borderRadius = "10px";
  div.style.maxWidth = "78%";
  div.style.whiteSpace = "pre-wrap";
  div.style.fontSize = "14px";
  div.style.wordBreak = "break-word";
  if(sender==="user"){ div.style.background="#DCF8C6"; div.style.marginLeft="auto"; }
  else{ div.style.background="#eee"; div.style.marginRight="auto"; }
  div.innerText = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}



function updateLanguageUI(lang){
  const chatContainer = document.getElementById("chatContainer");
  const textInput = document.getElementById("textInput");
  const sendBtn = document.getElementById("sendBtn");
  if (!chatContainer || !textInput || !sendBtn) return;
  const header = chatContainer.querySelector("div:first-child");
  header.childNodes[0].nodeValue = langText[lang].header + " ";
  textInput.placeholder = langText[lang].placeholder;
  sendBtn.innerText = langText[lang].sendBtn;
}

// ===== Send Message =====
async function handleSend(){
  const textInput = document.getElementById("textInput");
  const messages = document.getElementById("messages");
  const languageSelect = document.getElementById("languageSelect");
  
  if (!textInput || !messages || !languageSelect) {
    console.error("Chatbot elements not found");
    return;
  }
  
  const text = textInput.value.trim();
  if(!text) return;
  addMessage(text,"user");
  textInput.value = "";

  const loading = addMessage(langText[languageSelect.value].processing,"bot");

  // Crop price detection
  const cropMatch = text.toLowerCase().match(/\b(cotton|paddy|rice|wheat|maize|mirchi|chilli|onion|tomato|groundnut|dal|corn)\b/);
  const districtMatch = text.toLowerCase().match(/(karimnagar|hyderabad|secunderabad|warangal|nalgonda|adilabad|medak|nizamabad|telangana)/i);
  
  if(cropMatch && districtMatch){
    try{
      const crop = cropMatch[1];
      const state = "Telangana"; // Default to Telangana for demo
      const district = districtMatch[1];
      
      // Use the Agmarknet API directly
      const apiKey = '579b464db66ec23bdd0000016e7d5e3c5bef41f75baf0de6a8d3c9d5';
      const baseUrl = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
      const url = `${baseUrl}?api-key=${apiKey}&format=json&filters[commodity]=${crop}&filters[state]=${state}&limit=10`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if(data.records && data.records.length > 0){
        const record = data.records[0];
        const price = record.modal_price || "N/A";
        const market = record.market || "N/A";
        const date = record.arrival_date || record.date || new Date().toLocaleDateString();
        
        const msg = `🌾 ${crop.charAt(0).toUpperCase()+crop.slice(1)} Price\n📍 Market: ${market}\n💰 Price: ₹${price} per quintal\n📅 Date: ${date}`;
        loading.innerText = msg;
        return;
      }
    }catch(e){
      console.error("Price fetch error:", e);
      loading.innerText = "⚠️ Could not fetch live price. Try 'Cotton price in Karimnagar'";
      return;
    }
  }

  // Farming advice responses
  const lowerText = text.toLowerCase();
  let response = "";
  
  if(lowerText.includes("wheat")){
    response = "🌾 WHEAT FARMING TIPS:\n• Sowing: Oct-Nov (Rabi season)\n• Soil: Well-drained loamy soil\n• Water: Irrigation at tillering, flowering, grain-filling\n• Harvest: Mar-Apr\n• Yield: 40-50 quintals/hectare";
  } else if(lowerText.includes("rice")){
    response = "🌾 RICE FARMING TIPS:\n• Sowing: Jun-Jul (Kharif)\n• Soil: Clayey loamy with water retention\n• Water: Maintain standing water during growth\n• Harvest: Sep-Nov\n• Yield: 50-60 quintals/hectare";
  } else if(lowerText.includes("maize")){
    response = "🌾 MAIZE FARMING TIPS:\n• Sowing: Jun-Jul (Kharif)\n• Soil: Fertile loamy soil\n• Water: Regular irrigation in dry spells\n• Weed control: Essential at early stage\n• Harvest: 90-120 days after sowing\n• Yield: 50-60 quintals/hectare";
  } else if(lowerText.includes("cotton")){
    response = "🌾 COTTON FARMING TIPS:\n• Sowing: Jun-Jul\n• Soil: Well-drained medium/heavy soils\n• Water: 6-8 irrigations in season\n• Pest management: Monitor for bollworms\n• Harvest: Nov-Jan\n• Yield: 20-25 quintals/hectare";
  } else if(lowerText.includes("price") || lowerText.includes("cost")){
    response = "💰 PRICE INFO:\nTo get live prices, try:\n'Wheat price in Hyderabad'\n'Cotton price in Karimnagar'\n'Rice price in Telangana'\n\nOur system fetches real-time prices from Agmarknet!";
  } else if(lowerText.includes("loan")){
    response = "💳 LOAN & EMI CALCULATOR:\nUse our calculator section to:\n• Calculate EMI for farm loans\n• Plan monthly payments\n• Get profit predictions\n\nTypical farm loan: 1-5 lakhs at 8-10% interest";
  } else if(lowerText.includes("soil")){
    response = "🌱 SOIL TYPES:\n• Loamy: Best for most crops\n• Clay: Good water retention, drainage issues\n• Sandy: Drains quickly, needs fertilizer\n• Black/Regur: Great for cotton, pulses\n• Red: Good for groundnut, maize\n\nGet soil tested before planting!";
  } else if(lowerText.includes("pest") || lowerText.includes("disease")){
    response = "🐛 PEST & DISEASE MANAGEMENT:\n• Use neem-based sprays\n• Practice crop rotation\n• Remove infected plants early\n• Use resistant varieties\n• Regular field inspection\n\nConsult local agricultural officer for severe issues";
  } else if(lowerText.includes("fertilizer") || lowerText.includes("manure")){
    response = "🌾 FERTILIZER GUIDE:\n• NPK (Nitrogen, Phosphorus, Potassium)\n• Organic manure: 5-10 tons/hectare\n• Cow dung: Rich in nutrients\n• Compost: Improves soil structure\n• Biofertilizers: Eco-friendly option\n\nDo soil test for exact requirements";
  } else if(lowerText.includes("weather") || lowerText.includes("rain")){
    response = "🌤️ WEATHER TIPS:\n• Monitor rainfall patterns\n• Kharif: Jun-Oct (monsoon)\n• Rabi: Oct-Mar (winter)\n• Summer: Mar-May\n\nCheck local weather forecasts before irrigation";
  } else if(lowerText.includes("help") || lowerText.includes("assist") || lowerText === "help"){
    response = "🤖 CHATBOT FEATURES:\nI can help with:\n1. 🌾 Crop prices (e.g., 'Wheat price in Hyderabad')\n2. 📚 Farming tips for different crops\n3. 💰 Loan & profit calculations\n4. 🐛 Pest & disease management\n5. 🌱 Soil & fertilizer info\n6. 📱 Farm scheme details\n\nJust ask!";
  } else {
    response = "Hi! I can help you with:\n• 🌾 Crop prices (e.g., 'Cotton price in Karimnagar')\n• 📚 Farming tips\n• 💰 Loan calculations\n• 🐛 Pest management\n• 🌱 Soil guidance\n\nWhat would you like to know?";
  }
  
  loading.innerText = response;
}

// ===== Event Listeners =====
function setupChatbotListeners() {
  const sendBtn = document.getElementById("sendBtn");
  const textInput = document.getElementById("textInput");
  const chatbotIcon = document.getElementById("chatbotIcon");
  const closeBtn = document.getElementById("closeBtn");
  const languageSelect = document.getElementById("languageSelect");
  const messages = document.getElementById("messages");
  
  if (!sendBtn || !textInput || !chatbotIcon) {
    console.error("Chatbot elements not found. Retrying...");
    setTimeout(setupChatbotListeners, 500);
    return;
  }
  
  sendBtn.onclick = handleSend;
  textInput.addEventListener("keydown", e=>{
    if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); handleSend(); }
  });
  chatbotIcon.onclick = () => {
    const chatContainer = document.getElementById("chatContainer");
    if (chatContainer) chatContainer.style.display = "flex";
  };
  closeBtn.onclick = () => {
    const chatContainer = document.getElementById("chatContainer");
    if (chatContainer) chatContainer.style.display = "none";
    messages.innerHTML = ""; // Clear chat history
  };

  // ===== Language Switch UI Only =====
  languageSelect.addEventListener("change", () => {
    const lang = languageSelect.value;
    updateLanguageUI(lang);
  });

  // ===== Initial Setup =====
  updateLanguageUI(languageSelect.value);
  addMessage(langText[languageSelect.value].greeting,"bot");
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupChatbotListeners);
} else {
  setupChatbotListeners();
}

//====end

//===== script.js ===== //

// ===== Export functions =====
window.fetchLivePrices = fetchLivePrices;
window.predictPrices = predictPrices;
window.calculateLoan = calculateLoan;
window.calculateProfit = calculateProfit;
window.handleSend = handleSend;

// Add stub functions
function toggleChatbot() {
  chatContainer.style.display = chatContainer.style.display === "none" ? "flex" : "none";
}

function sendMessage(text) {
  textInput.value = text;
  handleSend();
}

//new endclose

// ===== Sidebar Functions to Open Pages in Same Tab =====
function openSeasonalCalendar() {
  window.location.href = './seasonal-calendar.html';
}

function openGovSchemes() {
  window.location.href = './gov-schemes.html';
}

function openLoanCalculator() {
  window.location.href = './loan-calculator.html';
}

function openProfitPredictor() {
  window.location.href = './profit.html';
}

function openCropRotation() {
  window.location.href = './crop-rotation.html';
}

function openWeather() {
  window.location.href = './weather.html';
}

function openRiskAlerts() {
  window.location.href = './risk-alerts.html';
}

function openBestDayToSell() {
  window.location.href = './best-day-to-sell.html';
}

// ===== Expose functions to global scope =====
// ===== Expose functions to global scope =====
window.openLogin = openLogin;
window.closeLogin = closeLogin;
window.openSignup = openSignup;
window.closeSignup = closeSignup;
window.login = login;
window.signup = signup;
window.fetchLivePrices = fetchLivePrices;
window.predictPrices = predictPrices;

window.openForgotPassword = openForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.sendResetLink = sendResetLink;
window.fetchWeather = fetchWeather;
window.toggleChatbot = toggleChatbot;
window.sendMessage = sendMessage;

// Expose sidebar functions
window.openSeasonalCalendar = openSeasonalCalendar;
window.openGovSchemes = openGovSchemes;
window.openLoanCalculator = openLoanCalculator;
window.openProfitPredictor = openProfitPredictor;
window.openCropRotation = openCropRotation;
window.openWeather = openWeather;
window.openRiskAlerts = openRiskAlerts;
window.openBestDayToSell = openBestDayToSell;



console.log('✓ All functions exposed to global scope');
console.log('✓ openLogin:', typeof window.openLogin);
console.log('✓ openSignup:', typeof window.openSignup);


//new open
// ===== Hero image carousel (auto-scroll enabled) =====
let carouselState = {
  slides: null,
  currentIndex: 0,
  interval: null
};

function startCarousel() {
  const slides = document.querySelectorAll('.hero-images .carousel-img');
  
  if (!slides || slides.length < 2) {
    console.log('❌ Carousel: Not enough slides found (' + (slides ? slides.length : 0) + ')');
    // Retry after a delay
    setTimeout(startCarousel, 500);
    return;
  }

  console.log('✓ Carousel: Found ' + slides.length + ' slides');
  carouselState.slides = slides;
  carouselState.currentIndex = 0;

  // Clear any existing interval
  if (carouselState.interval) {
    clearInterval(carouselState.interval);
  }

  // Show first slide
  showCurrentSlide();

  // Start rotation - change image every 4 seconds
  carouselState.interval = setInterval(() => {
    carouselState.currentIndex = (carouselState.currentIndex + 1) % slides.length;
    showCurrentSlide();
  }, 4000);

  console.log('✓ Carousel auto-rotation started (4s interval)');
}

function showCurrentSlide() {
  if (!carouselState.slides) return;
  
  carouselState.slides.forEach((slide, idx) => {
    if (idx === carouselState.currentIndex) {
      slide.classList.add('active');
      console.log('  → Showing slide ' + idx);
    } else {
      slide.classList.remove('active');
    }
  });
}

// Initialize carousel as soon as possible
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startCarousel();
} else {
  document.addEventListener('DOMContentLoaded', startCarousel);
}

// Also try after a short delay as backup
setTimeout(startCarousel, 500);

//close
