import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const THEMES = [
    { id: "light", name: "Claro", color: "bg-gray-100" },
    { id: "dark", name: "Escuro", color: "bg-gray-900" },
    { id: "ocean", name: "Oceano", color: "bg-blue-100" },
    { id: "sunset", name: "Pôr do Sol", color: "bg-orange-100" },
    { id: "cyberpunk", name: "Cyberpunk", color: "bg-black border border-green-500" },
];

export default function Settings() {
    const { user, refetchUser } = useAuth();
    const navigate = useNavigate();

    const [bio, setBio] = useState("");
    const [theme, setTheme] = useState("light");

    // Estados para arquivos e previews
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState("");

    const [bgFile, setBgFile] = useState(null);
    const [bgPreview, setBgPreview] = useState("");

    const [galleryFiles, setGalleryFiles] = useState([]); // Novos arquivos
    const [currentGallery, setCurrentGallery] = useState([]); // URLs existentes
    const [imagesToRemove, setImagesToRemove] = useState([]); // URLs para remover

    const [loading, setLoading] = useState(false);

    // Refs para inputs de arquivo
    const avatarInput = useRef(null);
    const coverInput = useRef(null);
    const bgInput = useRef(null);
    const galleryInput = useRef(null);

    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            setTheme(user.theme || "light");
            setAvatarPreview(user.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`) : "");
            setCoverPreview(user.coverPhotoUrl ? (user.coverPhotoUrl.startsWith('http') ? user.coverPhotoUrl : `${API_URL}${user.coverPhotoUrl}`) : "");
            setBgPreview(user.pageBackgroundUrl ? (user.pageBackgroundUrl.startsWith('http') ? user.pageBackgroundUrl : `${API_URL}${user.pageBackgroundUrl}`) : "");
            setCurrentGallery(user.gallery || []);
        }
    }, [user]);

    const handleFileChange = (e, setFile, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e) => {
        if (e.target.files) {
            setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)]);
        }
    };

    const removeExistingImage = (url) => {
        setCurrentGallery(prev => prev.filter(u => u !== url));
        setImagesToRemove(prev => [...prev, url]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const fd = new FormData();
        fd.append("bio", bio);
        fd.append("theme", theme);
        if (avatarFile) fd.append("avatar", avatarFile);
        if (coverFile) fd.append("coverPhoto", coverFile);
        if (bgFile) fd.append("pageBackground", bgFile);

        galleryFiles.forEach(file => fd.append("gallery", file));

        if (imagesToRemove.length > 0) {
            fd.append("removeGalleryImages", JSON.stringify(imagesToRemove));
        }

        try {
            await api.post("/users/me", fd, { headers: { "Content-Type": "multipart/form-data" } });
            await refetchUser();
            navigate(`/profile/${user._id}`);
        } catch (err) {
            alert("Erro ao salvar alterações.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <Navbar />
            <div className="container-healer mt-6 max-w-3xl">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">

                    {/* Header & Capa */}
                    <div className="relative h-48 bg-gray-200 group cursor-pointer" onClick={() => coverInput.current.click()}>
                        {coverPreview ? (
                            <img src={coverPreview} className="w-full h-full object-cover transition group-hover:opacity-80" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Clique para adicionar capa</div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition text-white font-bold">
                            📷 Alterar Capa
                        </div>
                        <input type="file" ref={coverInput} onChange={e => handleFileChange(e, setCoverFile, setCoverPreview)} className="hidden" accept="image/*" />
                    </div>

                    <div className="px-8 pb-8">
                        {/* Avatar */}
                        <div className="-mt-16 relative inline-block group cursor-pointer" onClick={() => avatarInput.current.click()}>
                            <img
                                src={avatarPreview || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-white transition group-hover:opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition text-white text-sm font-bold">
                                📷
                            </div>
                            <input type="file" ref={avatarInput} onChange={e => handleFileChange(e, setAvatarFile, setAvatarPreview)} className="hidden" accept="image/*" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-800 mt-4 mb-6">Personalizar Perfil</h1>

                        <div className="space-y-6">
                            {/* Biografia */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Biografia</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 outline-none transition"
                                    rows="3"
                                    placeholder="Conte algo sobre você..."
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                />
                            </div>

                            {/* Tema */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tema Visual</label>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {THEMES.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTheme(t.id)}
                                            className={`flex-shrink-0 w-20 h-16 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition ${theme === t.id ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <div className={`w-full h-full rounded-md ${t.color} opacity-80 flex items-center justify-center`}>
                                                {t.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Plano de Fundo da Página */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Fundo da Página (Wallpaper)</label>
                                <div className="flex items-center gap-4">
                                    {bgPreview && (
                                        <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200">
                                            <img src={bgPreview} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => { setBgFile(null); setBgPreview(""); }} className="absolute top-0 right-0 bg-red-500 text-white p-1 text-xs">✕</button>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => bgInput.current.click()}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
                                    >
                                        {bgPreview ? "Alterar Imagem" : "Escolher Imagem de Fundo"}
                                    </button>
                                    <input type="file" ref={bgInput} onChange={e => handleFileChange(e, setBgFile, setBgPreview)} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            {/* Galeria */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Galeria de Imagens</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                                    {/* Imagens Existentes */}
                                    {currentGallery.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                                            <img src={url.startsWith('http') ? url : `${API_URL}${url}`} className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeExistingImage(url)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold transition">Remover</button>
                                        </div>
                                    ))}
                                    {/* Novas Imagens */}
                                    {galleryFiles.map((file, i) => (
                                        <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-sky-500">
                                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-sky-500 text-white text-[10px] text-center">Novo</div>
                                        </div>
                                    ))}
                                    {/* Botão Adicionar */}
                                    <button
                                        type="button"
                                        onClick={() => galleryInput.current.click()}
                                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-sky-500 hover:text-sky-500 transition bg-gray-50"
                                    >
                                        <span className="text-2xl">+</span>
                                        <span className="text-xs font-bold">Add</span>
                                    </button>
                                </div>
                                <input type="file" multiple ref={galleryInput} onChange={handleGalleryChange} className="hidden" accept="image/*" />
                            </div>

                        </div>

                        {/* Botões de Ação */}
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
                            <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-lg bg-sky-500 text-white font-bold hover:bg-sky-600 shadow-lg shadow-sky-200 disabled:opacity-50 transition transform active:scale-95">
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}