// frontend/src/components/PostCard.jsx
import React, { useState, useEffect } from "react";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const PostCard = ({ post: initialPost, onDelete, onChanged }) => {
  const { user: me } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setPost(initialPost);
    setIsLiked(initialPost.reactions?.some(r => r.user._id === me?._id));
  }, [initialPost, me]);

  const handleLike = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/react`, { reactionType: 'love' });
      onChanged(data);
      setIsLiked(!isLiked);
    } catch (e) { console.error(e); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data } = await api.post(`/posts/${post._id}/comment`, { text: comment });
    setComment("");
    onChanged(data);
  };

  const handleVote = async (optionIndex) => {
    if (voting) return;
    setVoting(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/vote`, { optionIndex });
      onChanged(data);
    } catch (e) { console.error(e); }
    finally { setVoting(false); }
  };

  const userAvatar = post.user?.avatarUrl?.includes("uploads")
    ? `${API_URL}${post.user.avatarUrl}`
    : (post.user?.avatarUrl || `https://ui-avatars.com/api/?name=${post.user?.name}`);

  // Renderização condicional baseada no Tipo
  const renderContentBody = () => {
    // Enquete
    if (post.type === 'poll') {
      const totalVotes = post.pollOptions?.reduce((acc, opt) => acc + opt.votes.length, 0) || 0;

      return (
        <div className="my-3 space-y-2">
          {post.pollOptions?.map((opt, idx) => {
            const votes = opt.votes.length;
            const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
            const hasVoted = opt.votes.includes(me?._id);

            return (
              <div key={idx} onClick={() => handleVote(idx)} className={`relative h-10 rounded-lg overflow-hidden border cursor-pointer transition-all ${hasVoted ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-200 hover:border-purple-300'}`}>
                {/* Barra de Progresso */}
                <div className="absolute top-0 left-0 h-full bg-purple-100 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                {/* Texto e Porcentagem */}
                <div className="absolute inset-0 flex items-center justify-between px-3 z-10">
                  <span className={`font-medium text-sm ${hasVoted ? 'text-purple-900 font-bold' : 'text-gray-700'}`}>{opt.text}</span>
                  {totalVotes > 0 && <span className="text-xs font-bold text-gray-500">{percent}%</span>}
                </div>
              </div>
            );
          })}
          <div className="text-right text-xs text-gray-400 mt-1">{totalVotes} votos</div>
        </div>
      );
    }

    // Link
    if (post.type === 'link') {
      return (
        <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block my-3 bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">🔗</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-gray-800 truncate">{post.title || post.linkUrl}</p>
              <p className="text-xs text-blue-500 truncate">{post.linkUrl}</p>
            </div>
          </div>
        </a>
      );
    }

    return null;
  };

  return (
    <div className="card mb-4 animate-fade-in-up">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${post.user?._id}`}>
            <img src={userAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
          </Link>
          <div>
            <Link to={`/profile/${post.user?._id}`} className="font-bold text-sm text-gray-900 block leading-none mb-1">{post.user?.name}</Link>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}</span>
              {post.community && (
                <>
                  <span>•</span>
                  <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold text-[10px] uppercase">{post.community.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {me?._id === post.user?._id && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500 px-2">✕</button>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="px-4 pb-2">
        {post.title && <h3 className="font-black text-lg text-gray-800 mb-2 leading-tight">{post.title}</h3>}
        {post.text && <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap mb-2">{post.text}</p>}

        {/* Renderizador de Tipos Especiais */}
        {renderContentBody()}
      </div>

      {/* Mídia (Comum a blog e image) */}
      {post.mediaUrl && (
        <div className="w-full bg-black flex justify-center max-h-[500px] overflow-hidden">
          {post.mediaType === 'video' ? (
            <video src={`${API_URL}${post.mediaUrl}`} controls className="w-full h-auto" />
          ) : (
            <img src={`${API_URL}${post.mediaUrl}`} className="w-full object-contain h-auto" />
          )}
        </div>
      )}

      {/* Barra de Ações */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className={`flex items-center gap-1.5 transition-transform active:scale-90 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLiked ? 'fill-current' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            <span className="text-sm font-bold">{post.reactions?.length || 0}</span>
          </button>

          <button onClick={() => setShowCommentInput(!showCommentInput)} className="flex items-center gap-1.5 text-gray-500 hover:text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span className="text-sm font-bold">{post.comments?.length || 0}</span>
          </button>
        </div>
      </div>

      {/* Comentários */}
      {showCommentInput && (
        <div className="bg-gray-50 p-3 border-t">
          <form onSubmit={handleComment} className="flex gap-2">
            <input value={comment} onChange={e => setComment(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-purple-400" placeholder="Comente..." autoFocus />
            <button className="text-purple-600 font-bold text-sm px-2">Publicar</button>
          </form>
          {post.comments.length > 0 && (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
              {post.comments.slice().reverse().map((c, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="font-bold text-gray-800">{c.user?.name}:</span>
                  <span className="text-gray-600">{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(PostCard);