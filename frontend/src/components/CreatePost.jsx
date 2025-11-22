import { useState, useRef } from "react";
import { api } from "../api";

const CATEGORIES = ["Geral", "Dúvidas", "Discussão", "Arte", "Notícias", "Off-topic"];

export default function CreatePost({ onCreated }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Geral");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() && !file && !title.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("category", category);
      fd.append("text", text);
      if (file) fd.append("media", file);

      const { data: newPost } = await api.post("/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setTitle("");
      setCategory("Geral");
      setText("");
      setFile(null);
      onCreated && onCreated(newPost);
    } catch (err) {
      console.error("Erro ao publicar:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white shadow-md rounded-lg p-4 mb-4 border border-gray-100">
      <div className="mb-3 space-y-3">
        {/* Título e Categoria */}
        <div className="flex gap-2">
          <input
            className="flex-1 border-b border-gray-200 focus:border-sky-500 outline-none px-2 py-1 font-bold text-lg placeholder-gray-400"
            placeholder="Título do post (opcional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <select
            className="bg-gray-100 rounded-lg px-3 py-1 text-sm text-gray-700 focus:ring-2 focus:ring-sky-200 outline-none"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <textarea
          className="w-full resize-none outline-none bg-gray-50 rounded-lg px-3 py-2 placeholder-gray-400 min-h-[80px]"
          rows="3"
          placeholder="O que você está pensando?"
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      {file ? (
        <div className="relative mb-3">
          <img className="max-h-60 rounded-lg object-cover" src={URL.createObjectURL(file)} alt="Preview" />
          <button
            type="button"
            onClick={() => setFile(null)}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          <button
            type="button"
            className="flex items-center gap-2 text-sky-600 hover:bg-sky-50 px-3 py-2 rounded-full transition-colors text-sm font-medium"
            onClick={() => fileInputRef.current.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto/Vídeo
          </button>
        </div>

        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          ref={fileInputRef}
          onChange={e => setFile(e.target.files[0] || null)}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-sky-500 text-white px-6 py-2 rounded-full font-bold hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}