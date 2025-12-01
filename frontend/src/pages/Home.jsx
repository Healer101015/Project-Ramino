import { useEffect, useCallback } from "react";
import { useFeed } from "../hooks/useFeed";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import CreatePost from "../components/CreatePost.jsx";
import PostCard from "../components/PostCard.jsx";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();
  const { posts, loading, hasMore, fetchPosts, addPost, updatePost, removePost } = useFeed();

  useEffect(() => {
    document.title = "Comunidade";
    fetchPosts(true);
  }, [fetchPosts]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Container Principal */}
      <div className="container-healer md:mt-6">

        {/* Sidebar (Stories no Mobile / Sidebar no Desktop) */}
        <Sidebar />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <CreatePost onCreated={addPost} />

            {posts.map(p => (
              <PostCard
                key={p._id}
                post={p}
                onChanged={updatePost}
                onDelete={() => {
                  api.delete(`/posts/${p._id}`).then(() => removePost(p._id));
                }}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => fetchPosts(false)}
                className="w-full py-4 text-purple-600 font-bold text-sm"
              >
                {loading ? 'Carregando...' : 'Carregar mais posts'}
              </button>
            )}
          </div>

          {/* Coluna extra desktop (escondida no mobile) */}
          <div className="hidden md:block">
            <div className="card p-4 sticky top-24 bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
              <h3 className="font-bold text-lg mb-2">Bem-vindo ao Healer!</h3>
              <p className="text-sm opacity-90 mb-4">A comunidade mais vibrante para compartilhar seus momentos.</p>
              <button className="w-full bg-white text-purple-600 py-2 rounded-lg font-bold text-sm">Convide Amigos</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;