import { useState, useRef } from "react";
import { api } from "../api";

const TYPES = [
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'image', label: 'Imagem', icon: '🖼️' },
  { id: 'video', label: 'Vídeo', icon: '🎥' },
  { id: 'link', label: 'Link', icon: '🔗' },
  { id: 'poll', label: 'Enquete', icon: '📊' },
  { id: 'quiz', label: 'Quiz', icon: '❓' },
  { id: 'wiki', label: 'Wiki', icon: '📖' },
];

const CATEGORIES = ["Geral", "Dúvidas", "Discussão", "Arte", "Notícias", "Off-topic"];

// Props: onCreated (callback), targetUserId (ID do dono do mural, opcional)
export default function CreatePost({ onCreated, targetUserId }) {
  const [type, setType] = useState('blog');
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Geral");
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [pollOptions, setPollOptions] = useState([{ text: "" }, { text: "" }]);

  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const fileInputRef = useRef(null);

  const handlePollOptionChange = (index, val) => {
    const newOpts = [...pollOptions];
    newOpts[index].text = val;
    setPollOptions(newOpts);
  };
  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions([...pollOptions, { text: "" }]);
  };

  async function submit(e) {
    e.preventDefault();

    if (!title.trim() && type !== 'image') {
      return alert("Por favor, adicione um título.");
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("title", title);
      fd.append("category", category);
      fd.append("text", text);

      // LÓGICA DO MURAL: Se targetUserId existe, envia postedTo
      if (targetUserId) {
        fd.append("postedTo", targetUserId);
      }

      if (type === 'link') fd.append("linkUrl", linkUrl);

      if (type === 'poll') {
        const validOptions = pollOptions.filter(o => o.text.trim());
        if (validOptions.length < 2) throw new Error("Enquete precisa de pelo menos 2 opções.");
        fd.append("pollOptions", JSON.stringify(validOptions));
      }

      if (type === 'quiz') {
        if (!quizQuestion.trim()) throw new Error("Pergunta do quiz vazia.");
        const q = {
          question: quizQuestion,
          options: quizOptions,
          correctIndex: parseInt(correctIndex)
        };
        fd.append("quizQuestions", JSON.stringify([q]));
      }

      if (file) fd.append("media", file);

      const { data: newPost } = await api.post("/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Reset
      setTitle("");
      setText("");
      setFile(null);
      setLinkUrl("");
      setPollOptions([{ text: "" }, { text: "" }]);
      setQuizQuestion("");
      setQuizOptions(["", "", "", ""]);

      onCreated && onCreated(newPost);
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-4 border border-gray-200">
      {/* Se estamos no mural de alguém, mostramos um header diferente */}
      {targetUserId && (
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
          Escrever no Mural
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-gray-100 no-scrollbar">
        {TYPES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${type === t.id ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-200'}`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 font-bold text-lg outline-none placeholder-gray-400 border-b border-transparent focus:border-sky-300 transition-colors bg-transparent"
            placeholder={type === 'wiki' ? "Nome da Wiki" : "Título do post"}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          {/* Categoria só faz sentido em posts públicos, mas deixaremos aqui por enquanto */}
          <select
            className="bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none border-none"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {(type === 'blog' || type === 'wiki') && (
          <textarea
            className="w-full bg-gray-50 p-3 rounded-lg outline-none min-h-[100px] text-sm border border-transparent focus:bg-white focus:border-sky-200 transition-colors"
            placeholder={targetUserId ? "Deixe uma mensagem..." : (type === 'wiki' ? "Descreva o conteúdo..." : "Escreva seu blog aqui...")}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        )}

        {type === 'link' && (
          <input
            className="w-full border p-2 rounded bg-gray-50 text-sm"
            placeholder="Cole o link aqui (http://...)"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
          />
        )}

        {type === 'poll' && (
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
            <p className="text-xs font-bold text-gray-500 uppercase">Opções</p>
            {pollOptions.map((opt, i) => (
              <input key={i} className="w-full border border-gray-200 p-2 rounded text-sm outline-none" placeholder={`Opção ${i + 1}`} value={opt.text} onChange={e => handlePollOptionChange(i, e.target.value)} />
            ))}
            {pollOptions.length < 5 && <button type="button" onClick={addPollOption} className="text-xs text-sky-600 hover:underline font-medium">+ Opção</button>}
          </div>
        )}

        {type === 'quiz' && (
          <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
            <input className="w-full border p-2 rounded text-sm" placeholder="Pergunta do Quiz" value={quizQuestion} onChange={e => setQuizQuestion(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quizOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-white p-1 rounded border">
                  <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="accent-purple-600 ml-1" />
                  <input className="w-full outline-none text-sm" placeholder={`Resposta ${i + 1}`} value={opt} onChange={e => { const newO = [...quizOptions]; newO[i] = e.target.value; setQuizOptions(newO); }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {['blog', 'image', 'video', 'wiki'].includes(type) && (
          <div>
            {file ? (
              <div className="relative inline-block mt-2">
                {file.type.startsWith('image') ? <img className="h-20 rounded-lg object-cover border" src={URL.createObjectURL(file)} /> : <div className="h-20 w-24 bg-gray-100 rounded-lg flex items-center justify-center text-xs border">{file.name}</div>}
                <button type="button" onClick={() => setFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
              </div>
            ) : (
              <button type="button" className="flex items-center gap-2 text-gray-500 hover:text-sky-600 transition text-sm mt-2" onClick={() => fileInputRef.current.click()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Mídia
              </button>
            )}
            <input type="file" className="hidden" ref={fileInputRef} onChange={e => setFile(e.target.files[0])} accept={type === 'video' ? "video/*" : "image/*,video/*"} />
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
          <button type="submit" disabled={loading} className="bg-sky-500 text-white px-6 py-2 rounded-full font-bold hover:bg-sky-600 disabled:opacity-50 transition shadow-sm text-sm">
            {loading ? "Enviando..." : (targetUserId ? "Postar no Mural" : "Publicar")}
          </button>
        </div>
      </form>
    </div>
  );
}