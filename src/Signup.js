import React, { useState } from "react";
import api from "./api";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const res = await api.post("/signup", form);
      alert(res.data.message || "Signed up");
      nav("/");
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: 360, margin: "60px auto" }}>
      <h2>Signup</h2>
      <input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <br />
      <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <br />
      <input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <br />
      <button onClick={submit} disabled={loading}>{loading ? "..." : "Signup"}</button>
      <p>Already have account? <Link to="/">Signin</Link></p>
    </div>
  );
}
