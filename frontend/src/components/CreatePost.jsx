import { useState, useRef } from "react";
import { api } from "../api";

const TYPES = [
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'image', label: 'Imagem', icon: '🖼️' },
  { id: 'link', label: 'Link', icon: '🔗' },
  { id: 'poll', label: 'Enquete', icon: '📊' },
  { id: 'quiz', label: 'Quiz', icon: '❓' }
];

export default function CreatePost({ onCreated, communityId, availableCategories = ["Geral"] }) {
  const [type, setType] = useState('blog');
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(availableCategories[0] || "Geral");
  const [tags, setTags] = useState(""); // V6.0 - Tags
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [pollOptions, setPollOptions] = useState([{ text: "" }, { text: "" }]);
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const fileInputRef = useRef(null);

  const handlePollOptionChange = (i, v) => { const n = [...pollOptions]; n[i].text = v; setPollOptions(n); };
  const addPollOption = () => { if (pollOptions.length < 5) setPollOptions([...pollOptions, { text: "" }]); };

  async function submit(e) {
    e.preventDefault();
    if (!title.trim() && type !== 'image') return alert("Adicione um título.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("title", title);
      fd.append("category", category);
      fd.append("text", text);

      // Processar Tags (separadas por vírgula)
      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
      fd.append("tags", JSON.stringify(tagArray));

      if (type === 'link') fd.append("linkUrl", linkUrl);
      if (type === 'poll') fd.append("pollOptions", JSON.stringify(pollOptions.filter(o => o.text.trim())));
      if (type === 'quiz') fd.append("quizQuestions", JSON.stringify([{ question: quizQuestion, options: quizOptions, correctIndex }]));
      if (file) fd.append("media", file);

      const endpoint = communityId ? `/communities/${communityId}/posts` : "/posts";
      const { data } = await api.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });

      setTitle(""); setText(""); setFile(null); setTags("");
      onCreated && onCreated(data);
    } catch (err) { alert("Erro ao publicar"); } finally { setLoading(false); }
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-4 border border-gray-200">
      {communityId && <div className="text-xs font-bold text-sky-500 uppercase mb-2">Novo Post na Comunidade</div>}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 border-b no-scrollbar">
        {TYPES.map(t => <button key={t.id} type="button" onClick={() => setType(t.id)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${type === t.id ? 'bg-sky-100 text-sky-700' : 'bg-gray-50'}`}><span>{t.icon}</span> {t.label}</button>)}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input className="w-full font-bold text-lg outline-none placeholder-gray-400" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} />

        <div className="flex gap-2">
          <select className="bg-gray-100 rounded px-2 py-1 text-xs outline-none w-1/3" value={category} onChange={e => setCategory(e.target.value)}>
            {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="flex-1 bg-gray-50 rounded px-2 py-1 text-xs outline-none border border-transparent focus:border-sky-200" placeholder="Tags (ex: #arte, #teoria)" value={tags} onChange={e => setTags(e.target.value)} />
        </div>

        {(type === 'blog' || type === 'wiki') && <textarea className="w-full bg-gray-50 p-3 rounded-lg outline-none min-h-[100px] text-sm" placeholder="Escreva aqui..." value={text} onChange={e => setText(e.target.value)} />}
        {type === 'link' && <input className="w-full border p-2 rounded text-sm" placeholder="Link URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />}
        {type === 'poll' && <div className="space-y-2 bg-gray-50 p-2 rounded">{pollOptions.map((o, i) => <input key={i} className="w-full border p-1 rounded text-sm" placeholder={`Opção ${i + 1}`} value={o.text} onChange={e => handlePollOptionChange(i, e.target.value)} />)} <button type="button" onClick={addPollOption} className="text-xs text-sky-600">+ Opção</button></div>}
        {type === 'quiz' && <div className="bg-purple-50 p-2 rounded space-y-2"><input className="w-full border p-1 rounded text-sm" placeholder="Pergunta" value={quizQuestion} onChange={e => setQuizQuestion(e.target.value)} /><div className="grid grid-cols-2 gap-2">{quizOptions.map((o, i) => <div key={i} className="flex gap-1"><input type="radio" name="c" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} /><input className="w-full border p-1 rounded text-sm" value={o} onChange={e => { const n = [...quizOptions]; n[i] = e.target.value; setQuizOptions(n) }} /></div>)}</div></div>}

        <div className="flex justify-between items-center pt-2 border-t mt-2">
          <div className="flex gap-2">
            {['blog', 'image', 'video', 'wiki'].includes(type) && <button type="button" onClick={() => fileInputRef.current.click()} className="text-gray-500 hover:text-sky-600 text-sm">📷 Mídia</button>}
            <input type="file" className="hidden" ref={fileInputRef} onChange={e => setFile(e.target.files[0])} />
            {file && <span className="text-xs text-green-600 self-center">{file.name}</span>}
          </div>
          <button type="submit" disabled={loading} className="bg-sky-500 text-white px-4 py-1.5 rounded-full font-bold text-sm hover:bg-sky-600 disabled:opacity-50">Publicar</button>
        </div>
      </form>
    </div>
  );
}