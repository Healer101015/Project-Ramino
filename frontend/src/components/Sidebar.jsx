import { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Sidebar() {
  const { user } = useAuth();
  const [myCommunities, setMyCommunities] = useState([]);

  useEffect(() => {
    if (user) {
      api.get("/communities").then(({ data }) => {
        // Filtra as comunidades do usuário
        const myComms = data.filter(c => c.members.includes(user._id || user.id));
        setMyCommunities(myComms);
      });
    }
  }, [user]);

  return (
    <div className="space-y-6 sticky top-24">
      {/* Cartão de Perfil Mini */}
      <div className="card-amino p-6 text-center">
        <div className="relative inline-block">
          <img
            src={user?.avatarUrl ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`) : `https://ui-avatars.com/api/?name=${user?.name}`}
            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mx-auto"
          />
          <div className="absolute bottom-0 right-0 bg-amino-green w-5 h-5 rounded-full border-4 border-white"></div>
        </div>
        <h2 className="mt-3 font-bold text-lg text-gray-800">{user?.name}</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Membro</p>

        <div className="mt-4 flex justify-center gap-4 text-sm border-t pt-4 border-gray-50">
          <div className="text-center">
            <div className="font-bold text-gray-800">{user?.followers?.length || 0}</div>
            <div className="text-xs text-gray-400">Seguidores</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-gray-800">{user?.following?.length || 0}</div>
            <div className="text-xs text-gray-400">Seguindo</div>
          </div>
        </div>
      </div>

      {/* Lista de Comunidades Estilo Amino */}
      <div className="card-amino p-5">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Os Meus Aminos</h3>
        <div className="space-y-3">
          {myCommunities.map(c => (
            <Link to={`/communities/${c._id}`} key={c._id} className="flex items-center gap-3 group p-2 rounded-xl hover:bg-gray-50 transition">
              <img
                src={c.avatarUrl ? `${API_URL}${c.avatarUrl}` : `https://ui-avatars.com/api/?name=${c.name}`}
                className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:scale-110 transition duration-300"
              />
              <span className="font-bold text-gray-700 text-sm truncate group-hover:text-amino-green transition">{c.name}</span>
            </Link>
          ))}
          {myCommunities.length === 0 && <p className="text-sm text-gray-400 italic">Ainda não entraste em nenhum Amino.</p>}

          <Link to="/communities" className="block mt-4 text-center py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-amino-green hover:text-amino-green transition">
            + Explorar
          </Link>
        </div>
      </div>
    </div>
  );
}//preciso tirar algumas requisições desnecessárias e lembrar de usar .opened nos endpoint de select