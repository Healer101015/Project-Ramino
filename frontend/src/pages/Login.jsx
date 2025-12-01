import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.user, data.token);
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.error || "Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center amino-gradient-bg relative text-white">
      {/* Elementos decorativos estilo Amino */}
      <div className="amino-circle w-96 h-96 top-[-50px] left-[-100px] animate-pulse opacity-30"></div>
      <div className="amino-circle w-64 h-64 bottom-[-20px] right-[-50px] animate-pulse opacity-30 border-blue-500 shadow-blue-500/50 delay-700"></div>

      <div className="z-10 w-full max-w-sm px-6">
        <div className="flex flex-col items-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter mb-2" style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}>Amino</h1>
          <p className="text-gray-300 font-medium tracking-wide uppercase text-xs">Healer Edition</p>
        </div>

        {error && (
          <div className="bg-red-500/80 backdrop-blur text-white px-4 py-3 rounded-lg mb-6 text-sm text-center shadow-lg border border-red-400">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="relative group">
            <input
              className="w-full bg-black/40 border border-gray-600 focus:border-white text-white rounded-full px-5 py-3 outline-none transition-all placeholder-gray-400"
              placeholder="Email ou Telefone"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <input
              type="password"
              className="w-full bg-black/40 border border-gray-600 focus:border-white text-white rounded-full px-5 py-3 outline-none transition-all placeholder-gray-400"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-600 text-white font-bold text-lg rounded-full px-3 py-3 mt-4 shadow-lg shadow-green-500/30 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">Não tem conta?</p>
          <Link className="text-white font-bold hover:underline mt-1 block text-sm uppercase tracking-wider" to="/register">
            Cadastrar
          </Link>
        </div>
      </div>
    </div>
  );
}