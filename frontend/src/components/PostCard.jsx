import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const CATEGORIES = ["Geral", "Dúvidas", "Discussão", "Arte", "Notícias", "Off-topic"];

const getAvatarUrl = (user) => {
  if (!user?.avatarUrl) return null;
  if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
  return `${API_URL}${user.avatarUrl}`;
};

const GenericAvatar = ({ user, className }) => {
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return h;
  };

  const colors = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#4ade80", "#34d399", "#2dd4bf", "#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6"];
  const bgColor = colors[Math.abs(hash(String(user._id))) % colors.length];

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={`Avatar de ${user.name}`}
    >
      <span>{getInitials(user.name)}</span>
    </div>
  );
};

const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" /></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.875-1.979l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>;

const ReactionPicker = ({ onSelect, onHover }) => {
  const reactions = [
    { type: 'like', emoji: '👍' },
    { type: 'love', emoji: '❤️' },
    { type: 'haha', emoji: '😂' },
    { type: 'sad', emoji: '😢' },
  ];
  return (
    <div
      className="absolute bottom-full mb-2 flex gap-1 bg-white p-1 rounded-full shadow-lg border z-10"
      onMouseLeave={() => onHover(false)}
      onMouseEnter={() => onHover(true)}
    >
      {reactions.map(r => (
        <button
          key={r.type}
          onClick={() => onSelect(r.type)}
          className="text-2xl p-1 rounded-full hover:bg-gray-200 transform hover:scale-125 transition"
        >
          {r.emoji}
        </button>
      ))}
    </div>
  );
};

const PostCard = ({ post: initialPost, onDelete, onChanged }) => {
  const { user: me } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showActions, setShowActions] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Estados de edição
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editCategory, setEditCategory] = useState(post.category || "Geral");
  const [editText, setEditText] = useState(post.text);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    setPost(initialPost);
    setEditTitle(initialPost.title || "");
    setEditCategory(initialPost.category || "Geral");
    setEditText(initialPost.text);
  }, [initialPost]);

  const isOwner = me && post.user && me._id === post.user._id;
  const myReaction = post.reactions?.find(r => r.user._id === me._id);

  const handleReaction = async (reactionType) => {
    setShowReactionPicker(false);
    try {
      const { data: finalPost } = await api.post(`/posts/${post._id}/react`, { reactionType });
      onChanged(finalPost);
    } catch (error) {
      console.error("Falha ao reagir ao post.", error);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data: updatedPost } = await api.post(`/posts/${post._id}/comment`, { text: comment });
    setComment("");
    setShowCommentInput(false);
    onChanged(updatedPost);
  };

  const handleSaveEdit = async () => {
    try {
      const { data: updatedPost } = await api.put(`/posts/${post._id}`, {
        text: editText,
        title: editTitle,
        category: editCategory
      });
      onChanged(updatedPost);
      setIsEditing(false);
    } catch (error) {
      console.error("Falha ao editar o post", error);
    }
  };

  const handleShare = async () => {
    try {
      await api.post(`/posts/${post._id}/share`);
      alert("Publicação partilhada com sucesso!");
    } catch (error) {
      console.error("Falha ao partilhar a publicação", error);
    }
  };

  const getReactionButtonContent = () => {
    if (!myReaction) return <span>👍 Curtir</span>;
    switch (myReaction.type) {
      case 'love': return <span className="text-red-500">❤️ Amei</span>;
      case 'haha': return <span className="text-yellow-500">😂 Haha</span>;
      case 'sad': return <span className="text-blue-500">😢 Triste</span>;
      default: return <span className="text-sky-600">👍 Curti</span>;
    }
  };

  const getMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const renderPostContent = (p) => {
    if (!p?.user) {
      return <div className="p-4 text-gray-500 italic">Usuário indisponível</div>;
    }

    const avatarUrl = getAvatarUrl(p.user);
    const mediaSrc = getMediaUrl(p.mediaUrl);

    return (
      <>
        <div className="p-4">
          {/* Header do Post */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <Link to={`/profile/${p.user._id}`} className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <GenericAvatar user={p.user} className="w-10 h-10 text-sm" />
              )}
              <div>
                <div className="font-bold text-gray-900 hover:underline text-sm">{p.user.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: ptBR })}</span>
                  {p.isEdited && <span>• (editado)</span>}
                  {p.category && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">{p.category}</span>}
                </div>
              </div>
            </Link>

            {isOwner && (
              <div className="relative" ref={actionsRef}>
                <button onClick={() => setShowActions(prev => !prev)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                </button>
                {showActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 border">
                    <button onClick={() => { setIsEditing(true); setShowActions(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Editar</button>
                    <button onClick={() => { onDelete(); setShowActions(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Apagar</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full border rounded p-2 font-bold"
                placeholder="Título"
              />
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full border rounded p-2" rows="3" placeholder="Texto"></textarea>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="text-sm text-gray-600 hover:underline">Cancelar</button>
                <button onClick={handleSaveEdit} className="bg-sky-500 text-white px-4 py-1 rounded-md text-sm font-bold">Salvar</button>
              </div>
            </div>
          ) : (
            <div className="mb-2">
              {p.title && <h3 className="font-bold text-xl text-gray-900 mb-2">{p.title}</h3>}
              {p.text && <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{p.text}</p>}
            </div>
          )}
        </div>

        {mediaSrc && (
          <div className="bg-black/5 w-full flex justify-center">
            {p.mediaType === "image" ? (
              <img src={mediaSrc} className="max-h-[600px] object-contain w-full" />
            ) : (
              <video controls className="max-h-[600px] w-full"><source src={mediaSrc} /></video>
            )}
          </div>
        )}
      </>
    )
  }

  if (post.repostOf) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4">
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <Link to={`/profile/${post.user._id}`} className="font-bold hover:underline text-gray-800">{post.user.name}</Link> repostou
          </div>
        </div>
        <div className="mx-4 mb-4 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          {post.repostOf ? renderPostContent(post.repostOf) : <div className="p-4 italic text-gray-500">Publicação original removida.</div>}
        </div>

        <div className="flex gap-1 text-gray-600 border-t p-2 bg-gray-50">
          {/* Ações simplificadas para reposts (opcional) */}
          <button onClick={() => setShowCommentInput(prev => !prev)} className="flex-1 flex items-center justify-center gap-2 py-1 hover:bg-gray-200 rounded text-sm"><CommentIcon /> {post.comments?.length}</button>
        </div>
        {showCommentInput && (
          <form onSubmit={addComment} className="flex items-center gap-2 p-3 border-t bg-white">
            <input className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm" placeholder="Escreva um comentário..." value={comment} onChange={e => setComment(e.target.value)} />
            <button type="submit" className="text-sky-600 font-bold text-sm px-2">Enviar</button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4 border border-gray-100">
      {renderPostContent(post)}

      <div className="px-4 py-2">
        <div className="flex justify-between text-xs text-gray-500 mb-2 border-b border-gray-100 pb-2">
          <span>{post.reactions?.length || 0} Reações</span>
          <span>{post.comments?.length || 0} Comentários</span>
        </div>

        <div className="flex gap-1 text-gray-600">
          <div className="relative flex-1" onMouseEnter={() => setShowReactionPicker(true)}>
            {showReactionPicker && <ReactionPicker onSelect={handleReaction} onHover={setShowReactionPicker} />}
            <button onClick={() => handleReaction(myReaction ? myReaction.type : 'like')} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium transition-colors ${myReaction ? 'text-sky-600' : ''}`}>
              {getReactionButtonContent()}
            </button>
          </div>
          <button onClick={() => setShowCommentInput(prev => !prev)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium transition-colors"><CommentIcon /> Comentar</button>
          <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 font-medium transition-colors"><ShareIcon /> Partilhar</button>
        </div>
      </div>

      {showCommentInput && (
        <div className="bg-gray-50 p-3 border-t border-gray-100">
          <form onSubmit={addComment} className="flex items-center gap-2">
            <input className="flex-1 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm focus:border-sky-500 outline-none" placeholder="Escreva um comentário..." value={comment} onChange={e => setComment(e.target.value)} autoFocus />
            <button type="submit" className="bg-sky-500 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-sky-600">Enviar</button>
          </form>
        </div>
      )}

      {post.comments?.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 space-y-3 border-t border-gray-100">
          {post.comments.slice(-3).map((c, i) => (
            <div key={i} className="text-sm flex gap-2">
              <Link to={`/profile/${c.user._id}`} className="font-bold hover:underline text-gray-900 whitespace-nowrap">{c.user.name}</Link>
              <span className="text-gray-700">{c.text}</span>
            </div>
          ))}
          {post.comments.length > 3 && <div className="text-center text-xs text-gray-400 cursor-pointer hover:text-gray-600">Ver todos os comentários</div>}
        </div>
      )}
    </div>
  );
};

export default React.memo(PostCard);