import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./Signup";
import Signin from "./Signin";
import Messenger from "./Messenger";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Messenger />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
