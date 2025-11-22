import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Navbar from "../components/Navbar";

export default function Communities() {
    const [communities, setCommunities] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    useEffect(() => {
        api.get("/communities").then(res => setCommunities(res.data));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post("/communities", { name: newName, description: newDesc });
            setCommunities([...communities, data]);
            setShowCreate(false);
        } catch (error) {
            alert("Erro ao criar comunidade");
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <Navbar />
            <div className="container-healer mt-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Comunidades</h1>
                    <button onClick={() => setShowCreate(true)} className="bg-sky-500 text-white px-4 py-2 rounded-lg">Criar Nova</button>
                </div>

                {showCreate && (
                    <div className="card p-4 mb-6">
                        <h3 className="font-bold mb-2">Nova Comunidade</h3>
                        <input className="border p-2 rounded w-full mb-2" placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
                        <input className="border p-2 rounded w-full mb-2" placeholder="Descrição" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                        <button onClick={handleCreate} className="bg-green-500 text-white px-4 py-2 rounded">Salvar</button>
                        <button onClick={() => setShowCreate(false)} className="ml-2 text-gray-500">Cancelar</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {communities.map(c => (
                        <Link to={`/communities/${c._id}`} key={c._id} className="card p-4 hover:shadow-lg transition">
                            {c.avatarUrl && <img src={`http://localhost:4000${c.avatarUrl}`} className="w-16 h-16 rounded-full mb-3 object-cover" />}
                            <h2 className="font-bold text-lg">{c.name}</h2>
                            <p className="text-gray-500 text-sm">{c.description}</p>
                            <div className="mt-3 text-xs text-gray-400">{c.members.length} membros</div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}