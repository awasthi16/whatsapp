import React, { useEffect, useState, useRef } from "react";
import api from "./api";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

export default function Messenger() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const socketRef = useRef(null);
  const fileRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/me");
        setUser(res.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // connect socket only once user is known
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, { auth: { token: token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("socket connected", socket.id);
      loadChats();
    });

    socket.on("userOnline", ({ userId, online }) => {
      setOnlineUsers((s) => ({ ...s, [userId]: online }));
    });

    socket.on("newMessage", (message) => {
      if (activeChat && String(message.chat) === String(activeChat._id)) {
        setMessages((m) => [...m, message]);
      }
    });

    socket.on("typing", ({ chatId, userId, isTyping }) => {
      setTypingUsers((t) => ({ ...t, [chatId + "_" + userId]: isTyping }));
    });

    socket.on("messagesRead", ({ chatId, userId }) => {
      // optional: mark messages read in UI
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, [user]);

  const loadChats = async () => {
    try {
      const res = await api.get("/chats");
      setChats(res.data);
      // set online state map
      const map = {};
      res.data.forEach((c) => {
        c.members.forEach((m) => (map[m._id] = m.online));
      });
      setOnlineUsers(map);
    } catch (err) {
      console.error(err);
    }
  };

  const openChat = async (chat) => {
    setActiveChat(chat);
    setMessages([]);
    // join socket room
    socketRef.current.emit("joinChat", chat._id);
    // fetch messages
    const res = await api.get(`/chats/${chat._id}/messages`);
    setMessages(res.data);
  };

  // create private chat by other user's email
  const startPrivateChat = async () => {
    const email = prompt("Enter email of the user to chat with:");
    if (!email) return;
    try {
      // find user by email via backend? simple approach: create private chat by memberId
      // This frontend expects you to already know memberId; to make simple we call a small helper endpoint:
      const resp = await api.get("/users/by-email?email=" + encodeURIComponent(email)).catch(() => null);
      if (!resp?.data?.id) return alert("User not found");
      const res = await api.post("/chats", { type: "private", memberId: resp.data.id });
      loadChats();
      openChat(res.data);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // create group chat
  const createGroup = async () => {
    const name = prompt("Group name");
    const memberEmails = prompt("Comma separated emails of members");
    if (!memberEmails) return;
    // resolve emails to ids
    try {
      const emails = memberEmails.split(",").map((e) => e.trim());
      const resp = await api.post("/resolve-emails", { emails });
      const memberIds = resp.data.ids;
      const res = await api.post("/chats", { type: "group", name, members: memberIds });
      loadChats();
      openChat(res.data);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // send message (text or image)
  const sendMessage = async () => {
    if (!msg.trim() && !imageFile) return;
    try {
      let imageUrl = null;
      if (imageFile) {
        const form = new FormData();
        form.append("image", imageFile);
        const upl = await api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        imageUrl = upl.data.url;
        setImageFile(null);
        fileRef.current.value = "";
      }
      socketRef.current.emit("sendMessage", { chatId: activeChat._id, text: msg, image: imageUrl }, (ack) => {
        // ack handler if needed
      });
      setMsg("");
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // typing events
  useEffect(() => {
    if (!activeChat || !socketRef.current) return;
    const t = setTimeout(() => socketRef.current.emit("typing", { chatId: activeChat._id, isTyping: false }), 1000);
    socketRef.current.emit("typing", { chatId: activeChat._id, isTyping: true });
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [msg]);

  // helper endpoints: (we need two small endpoints used by frontend)
  // - /users/by-email?email=...
  // - /resolve-emails  { emails: [] } -> { ids: [] }
  // if backend lacks them, create them (instructions below). For quick use, you can manually create chats from DB.

  const logout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      <div style={{ width: 300, border: "1px solid #ccc", padding: 10 }}>
        <h3>Chats</h3>
        <p>Logged in as: {user?.name} <button onClick={logout}>Logout</button></p>
        <button onClick={startPrivateChat}>Start Private Chat</button>
        <button onClick={createGroup}>Create Group</button>
        <hr />
        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          {chats.map((c) => (
            <div key={c._id} style={{ padding: 6, cursor: "pointer", borderBottom: "1px solid #eee" }} onClick={() => openChat(c)}>
              <b>{c.type === "group" ? c.name : c.members.find(m => m._id !== user._id)?.name || "Private"}</b>
              <div style={{ fontSize: 12 }}>
                {c.type === "private" ? (
                  <span>{c.members.find(m => m._id !== user._id)?.email}</span>
                ) : (
                  <span>{c.members.length} members</span>
                )}
                <span style={{ float: "right", color: onlineUsers[c.members.find(m => m._id !== user._id)?._id] ? "green" : "gray" }}>
                  {c.type === "private" ? (onlineUsers[c.members.find(m => m._id !== user._id)?._id] ? "● online" : "● offline") : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, border: "1px solid #ccc", padding: 10 }}>
        {!activeChat ? (
          <div>Select a chat</div>
        ) : (
          <>
            <h3>{activeChat.type === "group" ? activeChat.name : activeChat.members.find(m => m._id !== user._id)?.name}</h3>

            <div style={{ height: 400, overflowY: "auto", border: "1px solid #eee", padding: 10 }}>
              {messages.map((m) => (
                <div key={m._id} style={{ marginBottom: 8 }}>
                  <b>{m.sender.name}</b> <small>({new Date(m.createdAt).toLocaleTimeString()})</small>
                  <div>{m.text}</div>
                  {m.image && <div><img src={m.image} alt="sent" style={{ maxWidth: 200 }} /></div>}
                </div>
              ))}

              <div>
                {Object.entries(typingUsers).map(([k, v]) => v ? <small key={k}>Someone is typing...</small> : null)}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type..."
                style={{ width: "60%", padding: 8 }}
              />
              <input ref={fileRef} type="file" onChange={(e) => setImageFile(e.target.files?.[0])} />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
