// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDeRxh9nr0_4KKrtWft3k4eecD8ZgXVZgo",
  authDomain: "zyra-ai-5ee3d.firebaseapp.com",
  projectId: "zyra-ai-5ee3d",
  storageBucket: "zyra-ai-5ee3d.firebasestorage.app",
  messagingSenderId: "977293799267",
  appId: "1:977293799267:web:7ba1889b640ed2291f2d56",
  measurementId: "G-GGEW7HMG9P"
};

// ✅ Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ✅ Cloudflare Worker URL
const WORKER_URL = "https://zyra-router.amaa9n.workers.dev";

// Elements
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const fileInput = document.getElementById("file-input");
const chatBox = document.getElementById("chat-box");

let currentUser = null;

// ✅ Auth handling
loginBtn.onclick = () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.signInWithEmailAndPassword(email, password)
    .then(user => {
      currentUser = user;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      alert("Logged in!");
    })
    .catch(() => alert("Login failed"));
};

logoutBtn.onclick = () => {
  auth.signOut().then(() => {
    currentUser = null;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    alert("Logged out!");
  });
};

// ✅ Send message
sendBtn.onclick = async () => {
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage("You", message, "user");

  let fileUrl = "";
  if (fileInput.files.length > 0) {
    if (!currentUser) {
      alert("Login required to upload files");
      return;
    }
    const file = fileInput.files[0];
    const storageRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    fileUrl = await storageRef.getDownloadURL();
  }

  // Get selected models
  const selectedModels = Array.from(document.querySelectorAll(".model-select input:checked"))
                              .map(cb => cb.value);

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      message: message + (fileUrl ? `\nFile: ${fileUrl}` : ""),
      models: selectedModels
    })
  });

  const data = await response.json();

  Object.keys(data).forEach(model => {
    addMessage(model, data[model], "bot");
  });

  // Save history if logged in
  if (currentUser) {
    await db.collection("chats").add({
      uid: currentUser.uid,
      message,
      fileUrl,
      response: data,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  messageInput.value = "";
  fileInput.value = "";
};

// ✅ Add message to chat UI
function addMessage(sender, text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.innerText = `${sender}: ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
