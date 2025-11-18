"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ code: input }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      alert("Incorrect Code");
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      backgroundColor: "#111827",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      margin: 0
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "40px",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "350px",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
      }}>
        <h1 style={{ color: "#111827", marginBottom: "10px", fontSize: "24px" }}>Welcome</h1>
        <p style={{ color: "#6b7280", marginBottom: "20px" }}>Enter Access Code</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password" // Makes it dots
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="123456"
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "18px",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              marginBottom: "20px",
              color: "#000000",
              backgroundColor: "#f9fafb",
              boxSizing: "border-box" // Ensures padding doesn't break width
            }}
          />
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "16px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {loading ? "Checking..." : "Enter App"}
          </button>
        </form>
      </div>
    </div>
  );
}
