import { useState, useRef } from "react";
import { api } from "../api";

const TYPES = [
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'image', label: 'Imagem', icon: '🖼️' },
  { id: 'link', label: 'Link', icon: '🔗' },
  { id: 'poll', label: 'Enquete', icon: '📊' },
  { id: 'quiz', label: 'Quiz', icon: '❓' },
  { id: 'wiki', label: 'Wiki', icon: '📖' },
];

export default function CreatePost({ onCreated }) {
  const [type, setType] = useState('blog');
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Geral");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Enquete
  const [pollOptions, setPollOptions] = useState([{ text: "" }, { text: "" }]);

  // Quiz (Simples: 1 pergunta demo para não complicar a UI neste exemplo)
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const fileInputRef = useRef(null);

  const handleOptionChange = (index, val) => {
    const newOpts = [...pollOptions];
    newOpts[index].text = val;
    setPollOptions(newOpts);
  };

  const addOption = () => setPollOptions([...pollOptions, { text: "" }]);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return alert("Adicione um título!");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("title", title);
      fd.append("category", category);
      fd.append("text", text);

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
        fd.append("quizQuestions", JSON.stringify([q])); // Enviando array com 1 pergunta
      }

      if (file) fd.append("media", file);

      const { data: newPost } = await api.post("/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Reset
      setTitle(""); setText(""); setFile(null); setLinkUrl("");
      setPollOptions([{ text: "" }, { text: "" }]);
      onCreated && onCreated(newPost);
    } catch (err) {
      alert(err.message || "Erro ao publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-gray-100">
      {/* Seletor de Tipo */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${type === t.id ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full font-bold text-lg outline-none placeholder-gray-400"
          placeholder="Título do post"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* Corpo Variável */}
        {type === 'blog' && (
          <textarea className="w-full bg-gray-50 p-2 rounded outline-none min-h-[100px]" placeholder="Escreva seu blog..." value={text} onChange={e => setText(e.target.value)} />
        )}

        {type === 'link' && (
          <input className="w-full border p-2 rounded bg-gray-50" placeholder="Cole o link aqui (http://...)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
        )}

        {type === 'poll' && (
          <div className="space-y-2 bg-gray-50 p-3 rounded">
            <p className="text-sm font-bold text-gray-600">Opções da Enquete:</p>
            {pollOptions.map((opt, i) => (
              <input key={i} className="w-full border p-1.5 rounded text-sm" placeholder={`Opção ${i + 1}`} value={opt.text} onChange={e => handleOptionChange(i, e.target.value)} />
            ))}
            {pollOptions.length < 5 && <button type="button" onClick={addOption} className="text-xs text-sky-600 hover:underline">+ Adicionar Opção</button>}
          </div>
        )}

        {type === 'quiz' && (
          <div className="space-y-2 bg-gray-50 p-3 rounded">
            <input className="w-full border p-2 rounded mb-2" placeholder="Pergunta do Quiz" value={quizQuestion} onChange={e => setQuizQuestion(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              {quizOptions.map((opt, i) => (
                <div key={i} className="flex gap-1">
                  <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  <input className="w-full border p-1.5 rounded text-sm" placeholder={`Resposta ${i + 1}`} value={opt} onChange={e => {
                    const newO = [...quizOptions]; newO[i] = e.target.value; setQuizOptions(newO);
                  }} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">* Marque a bolinha da resposta correta.</p>
          </div>
        )}

        {/* Upload Mídia (Comum a quase todos, exceto talvez Poll estrita) */}
        {(type === 'blog' || type === 'image' || type === 'video' || type === 'wiki') && (
          <div className="flex gap-2">
            <button type="button" onClick={() => fileInputRef.current.click()} className="text-gray-500 hover:text-sky-600 transition">
              📷 Adicionar Mídia
            </button>
            {file && <span className="text-xs text-green-600 self-center">{file.name}</span>}
          </div>
        )}
        <input type="file" className="hidden" ref={fileInputRef} onChange={e => setFile(e.target.files[0])} accept="image/*,video/*" />

        <div className="flex justify-end pt-2">
          <button disabled={loading} className="bg-sky-500 text-white px-6 py-2 rounded-full font-bold hover:bg-sky-600 disabled:opacity-50">
            {loading ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}