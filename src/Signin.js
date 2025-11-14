import React, { useState } from "react";
import api from "./api";
import { useNavigate, Link } from "react-router-dom";

export default function Signin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = async () => {
    try {
      const res = await api.post("/signin", form);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        nav("/chat");
      } else {
        alert(res.data.error || "Signin failed");
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ width: 360, margin: "60px auto" }}>
      <h2>Signin</h2>
      <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <br />
      <input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <br />
      <button onClick={submit}>Signin</button>
      <p>No account? <Link to="/signup">Signup</Link></p>
    </div>
  );
}
