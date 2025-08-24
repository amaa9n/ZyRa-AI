// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ===== Elements =====
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const chatBox = document.getElementById("chat-box");
const fileInput = document.getElementById("file-input");

// ===== Login/Logout =====
loginBtn.addEventListener("click", async () => {
  try { await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value); }
  catch (err) { alert(err.message); }
});
logoutBtn.addEventListener("click", async () => { await auth.signOut(); });

// ===== Auth State =====
auth.onAuthStateChanged(user => {
  if (user) { loginBtn.style.display = "none"; logoutBtn.style.display = "inline-block"; loadHistory(user); }
  else { loginBtn.style.display = "inline-block"; logoutBtn.style.display = "none"; chatBox.innerHTML=""; }
});

// ===== Send Message =====
sendBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  if (!message && !fileInput.files.length) return;

  const selectedModels = Array.from(document.querySelectorAll("#model-select input:checked")).map(i=>i.value);
  if (selectedModels.length===0){ alert("Select at least one AI model"); return; }

  let fileUrl="";
  if (fileInput.files.length){
    const user = auth.currentUser;
    if(!user){ alert("Login required to upload files"); return; }
    const file = fileInput.files[0];
    const ref = storage.ref(`uploads/${user.uid}/${file.name}`);
    await ref.put(file);
    fileUrl = await ref.getDownloadURL();
  }

  addMessage("You", message, fileUrl);

  const response = await fetch("https://zyra-router.amaa9n.workers.dev",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ message: message + (fileUrl ? `\nFile: ${fileUrl}` : ""), models: selectedModels })
  });

  const data = await response.json();
  data.results.forEach(r=>addMessage(r.model,r.reply));

  const user = auth.currentUser;
  if(user){ db.collection("chats").add({ uid:user.uid, message, fileUrl, response:data.results, timestamp:firebase.firestore.FieldValue.serverTimestamp() }); }

  messageInput.value=""; fileInput.value="";
});

// ===== Add message =====
function addMessage(sender, text, fileUrl=""){
  const div=document.createElement("div");
  div.className=sender==="You"?"chat-user":"chat-ai";
  div.innerHTML=`<strong>${sender}:</strong> ${text}${fileUrl?`<br><a href="${fileUrl}" target="_blank">Attachment</a>`:""}`;
  chatBox.appendChild(div);
  chatBox.scrollTop=chatBox.scrollHeight;
}

// ===== Load history =====
function loadHistory(user){
  db.collection("chats").where("uid","==",user.uid).orderBy("timestamp").get()
    .then(snapshot=>snapshot.forEach(doc=>{
      addMessage("You",doc.data().message,doc.data().fileUrl);
      doc.data().response.forEach(r=>addMessage(r.model,r.reply));
    }));
}
