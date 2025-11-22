import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Communities() {
    const [communities, setCommunities] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [file, setFile] = useState(null);

    useEffect(() => {
        api.get("/communities").then(res => setCommunities(res.data));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const fd = new FormData();
            fd.append("name", newName);
            fd.append("description", newDesc);
            if (file) fd.append("avatar", file); // Upload de avatar da comunidade

            const { data } = await api.post("/communities", fd, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setCommunities([...communities, data]);
            setShowCreate(false);
            setNewName(""); setNewDesc(""); setFile(null);
        } catch (error) {
            alert("Erro ao criar comunidade");
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <Navbar />
            <div className="container-healer mt-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Comunidades</h1>
                    <button onClick={() => setShowCreate(true)} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg transition font-medium">
                        + Criar Comunidade
                    </button>
                </div>

                {showCreate && (
                    <div className="card p-6 mb-8 animate-fade-in">
                        <h3 className="font-bold text-lg mb-4">Nova Comunidade</h3>
                        <div className="space-y-4">
                            <input className="border p-2 rounded w-full" placeholder="Nome da Comunidade" value={newName} onChange={e => setNewName(e.target.value)} />
                            <input className="border p-2 rounded w-full" placeholder="Descrição curta" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Ícone (Opcional)</label>
                                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="text-sm" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleCreate} className="bg-green-500 text-white px-4 py-2 rounded font-medium">Salvar</button>
                                <button onClick={() => setShowCreate(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded font-medium">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {communities.map(c => (
                        <Link to={`/communities/${c._id}`} key={c._id} className="card p-0 hover:shadow-xl transition-shadow group overflow-hidden flex flex-col">
                            <div className="h-20 bg-gradient-to-r from-sky-400 to-blue-500"></div>
                            <div className="px-4 pb-4 flex-1 flex flex-col relative">
                                <div className="-mt-10 mb-3">
                                    <img
                                        src={c.avatarUrl ? `${API_URL}${c.avatarUrl}` : `https://ui-avatars.com/api/?name=${c.name}&background=random`}
                                        className="w-20 h-20 rounded-xl shadow-md object-cover bg-white border-4 border-white"
                                    />
                                </div>
                                <h2 className="font-bold text-xl text-gray-800 group-hover:text-sky-600 transition-colors">{c.name}</h2>
                                <p className="text-gray-500 text-sm mt-1 flex-1">{c.description}</p>
                                <div className="mt-4 pt-3 border-t text-xs text-gray-400 font-semibold">
                                    {c.members?.length || 0} MEMBROS
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}