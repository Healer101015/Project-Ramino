import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const StepIndicator = ({ step }) => (
    <div className="flex items-center justify-center mb-6 space-x-2">
        {[1, 2, 3].map(i => <div key={i} className={`h-2 w-12 rounded-full transition-colors ${i <= step ? 'bg-sky-500' : 'bg-gray-200'}`} />)}
    </div>
);

export default function Communities() {
    const [communities, setCommunities] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: "", description: "", rules: "", avatar: null, cover: null, admins: [] });

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => { api.get("/communities").then(res => setCommunities(res.data)); }, []);

    useEffect(() => {
        if (searchQuery.length > 2) api.get(`/users/search?q=${searchQuery}`).then(res => setSearchResults(res.data));
        else setSearchResults([]);
    }, [searchQuery]);

    const handleFile = (e, field) => setFormData({ ...formData, [field]: e.target.files[0] });

    const toggleAdmin = (user) => {
        const exists = formData.admins.find(u => u._id === user._id);
        setFormData(p => ({ ...p, admins: exists ? p.admins.filter(u => u._id !== user._id) : [...p.admins, user] }));
    };

    const handleSubmit = async () => {
        try {
            const fd = new FormData();
            fd.append("name", formData.name);
            fd.append("description", formData.description);
            fd.append("rules", formData.rules);
            if (formData.avatar) fd.append("avatar", formData.avatar);
            if (formData.cover) fd.append("cover", formData.cover);
            fd.append("initialAdmins", JSON.stringify(formData.admins.map(u => u._id)));

            const { data } = await api.post("/communities", fd, { headers: { "Content-Type": "multipart/form-data" } });
            setCommunities([...communities, data]);
            setShowCreate(false);
            setStep(1); setFormData({ name: "", description: "", rules: "", avatar: null, cover: null, admins: [] });
        } catch (error) { alert("Erro ao criar comunidade"); }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <Navbar />
            <div className="container-healer mt-6 px-4">
                <div className="flex justify-between items-center mb-8">
                    <div><h1 className="text-3xl font-bold text-gray-900">Comunidades</h1><p className="text-gray-500">Participe ou crie a sua.</p></div>
                    <button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition font-bold">+ Criar Comunidade</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {communities.map(c => (
                        <Link to={`/communities/${c._id}`} key={c._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 group">
                            <div className="h-24 bg-gray-200 relative">
                                {c.coverUrl && <img src={`${API_URL}${c.coverUrl}`} className="w-full h-full object-cover" />}
                                <div className="absolute -bottom-8 left-4">
                                    <img src={c.avatarUrl ? `${API_URL}${c.avatarUrl}` : `https://ui-avatars.com/api/?name=${c.name}`} className="w-16 h-16 rounded-xl border-4 border-white bg-white shadow-sm object-cover" />
                                </div>
                            </div>
                            <div className="pt-10 px-4 pb-4">
                                <h2 className="font-bold text-lg text-gray-800 group-hover:text-sky-600 transition">{c.name}</h2>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2 h-10">{c.description}</p>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400 font-semibold uppercase">
                                    <span>{c.members?.length || 0} Membros</span><span className="text-sky-500">Entrar &rarr;</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Nova Comunidade</h2>
                                <button onClick={() => setShowCreate(false)} className="text-gray-400 text-2xl">&times;</button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <StepIndicator step={step} />
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-700">Básico</h3>
                                        <input className="w-full border p-3 rounded-lg" placeholder="Nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus />
                                        <textarea className="w-full border p-3 rounded-lg" rows="3" placeholder="Descrição" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Avatar</label><input type="file" onChange={e => handleFile(e, 'avatar')} className="text-sm" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Capa</label><input type="file" onChange={e => handleFile(e, 'cover')} className="text-sm" /></div>
                                        </div>
                                    </div>
                                )}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-700">Regras</h3>
                                        <textarea className="w-full border p-3 rounded-lg min-h-[200px]" placeholder="Escreva as regras..." value={formData.rules} onChange={e => setFormData({ ...formData, rules: e.target.value })} />
                                    </div>
                                )}
                                {step === 3 && (
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-700">Convidar Admins</h3>
                                        <input className="w-full border p-2 rounded-lg" placeholder="Buscar usuário..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                        {searchResults.length > 0 && (
                                            <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                                                {searchResults.map(u => (
                                                    <button key={u._id} onClick={() => toggleAdmin(u)} className="w-full text-left px-3 py-2 hover:bg-sky-50 flex items-center gap-2 border-b last:border-0">
                                                        <span className="text-sm flex-1">{u.name}</span>
                                                        {formData.admins.find(a => a._id === u._id) && <span className="text-green-500 font-bold">✓</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {formData.admins.map(u => <span key={u._id} className="bg-sky-100 text-sky-800 px-2 py-1 rounded-full text-xs">{u.name}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t bg-gray-50 flex justify-between">
                                {step > 1 ? <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-gray-600 font-bold">Voltar</button> : <div />}
                                {step < 3 ? <button onClick={() => setStep(step + 1)} disabled={!formData.name} className="px-6 py-2 bg-sky-500 text-white font-bold rounded-lg disabled:opacity-50">Próximo</button> : <button onClick={handleSubmit} className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg">Criar</button>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}