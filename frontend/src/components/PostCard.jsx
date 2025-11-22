import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const getAvatarUrl = (user) => {
  if (!user?.avatarUrl) return null;
  if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
  return `${API_URL}${user.avatarUrl}`;
};

// Componentes Auxiliares
const GenericAvatar = ({ user }) => (
  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-sm">
    {user?.name?.substring(0, 2).toUpperCase() || "?"}
  </div>
);

const CommentIcon = () => <span className="text-xl">💬</span>;
const ShareIcon = () => <span className="text-xl">🔁</span>;
const HeartIcon = ({ filled }) => <span className={`text-xl ${filled ? 'text-red-500' : 'text-gray-500'}`}>{filled ? '❤️' : '🤍'}</span>;

const PostCard = ({ post: initialPost, onDelete, onChanged }) => {
  const { user: me } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");

  // Estados para Quiz
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedQuizOpt, setSelectedQuizOpt] = useState(null);

  useEffect(() => setPost(initialPost), [initialPost]);

  const isOwner = me && post.user && me._id === post.user._id;
  const myReaction = post.reactions?.find(r => r.user._id === me._id);

  const handleReaction = async () => {
    try {
      const { data } = await api.post(`/posts/${post._id}/react`, { reactionType: 'like' });
      onChanged(data);
    } catch (e) { console.error(e); }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data } = await api.post(`/posts/${post._id}/comment`, { text: comment });
    setComment("");
    onChanged(data);
  };

  const handlePollVote = async (index) => {
    try {
      const { data } = await api.post(`/posts/${post._id}/vote`, { optionIndex: index });
      // Recarregar post manualmente ou atualizar estado local se o backend retornar o post atualizado
      // Aqui estou assumindo que 'data' é o post atualizado
      // Precisamos repopular para mostrar o total corretamente, idealmente o backend já devolve populado ou fazemos refetch
      onChanged(data); // Simples update
      // Em um app real, faríamos um refetch para garantir a contagem exata
    } catch (e) { console.error(e); }
  };

  // --- Renderizadores de Conteúdo ---

  const renderPoll = () => {
    const totalVotes = post.pollOptions.reduce((acc, opt) => acc + opt.votes.length, 0);
    const myVoteIndex = post.pollOptions.findIndex(opt => opt.votes.includes(me._id));

    return (
      <div className="my-3 space-y-2">
        {post.pollOptions.map((opt, i) => {
          const percent = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
          const isSelected = myVoteIndex === i;
          return (
            <button
              key={i}
              onClick={() => handlePollVote(i)}
              className={`relative w-full text-left border rounded-lg overflow-hidden h-10 ${isSelected ? 'border-sky-500 ring-1 ring-sky-500' : 'border-gray-300'}`}
            >
              <div className="absolute top-0 left-0 h-full bg-sky-100 transition-all duration-500" style={{ width: `${percent}%` }}></div>
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-3 z-10">
                <span className={`font-medium text-sm ${isSelected ? 'text-sky-700' : 'text-gray-700'}`}>{opt.text}</span>
                <span className="text-xs font-bold text-gray-500">{percent}%</span>
              </div>
            </button>
          );
        })}
        <div className="text-xs text-gray-400 mt-1">{totalVotes} votos</div>
      </div>
    );
  };

  const renderQuiz = () => {
    // Exibindo apenas a primeira pergunta para simplificar
    const q = post.quizQuestions[0];
    if (!q) return null;

    return (
      <div className="my-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
        <h4 className="font-bold text-purple-800 mb-3">❓ Quiz: {q.question}</h4>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt, i) => {
            let btnClass = "bg-white border border-purple-200 text-gray-700 hover:bg-purple-100";
            if (quizAnswered) {
              if (i === q.correctIndex) btnClass = "bg-green-500 text-white border-green-600";
              else if (i === selectedQuizOpt && i !== q.correctIndex) btnClass = "bg-red-500 text-white border-red-600";
              else btnClass = "bg-gray-100 text-gray-400 opacity-50";
            }

            return (
              <button
                key={i}
                disabled={quizAnswered}
                onClick={() => { setQuizAnswered(true); setSelectedQuizOpt(i); }}
                className={`p-3 rounded-lg font-medium text-sm transition-colors ${btnClass}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderLink = () => (
    <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block my-3 bg-gray-50 border rounded-lg p-3 flex items-center gap-3 hover:bg-gray-100 transition">
      <div className="bg-gray-200 p-2 rounded text-2xl">🔗</div>
      <div className="overflow-hidden">
        <div className="font-bold text-sky-600 truncate">{post.title || post.linkUrl}</div>
        <div className="text-xs text-gray-500 truncate">{post.linkUrl}</div>
      </div>
    </a>
  );

  const renderWiki = () => (
    <div className="my-3 border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-r-lg">
      <div className="uppercase text-[10px] font-bold text-yellow-600 tracking-wider mb-1">Entrada Wiki</div>
      <h3 className="font-bold text-gray-800 text-lg">{post.title}</h3>
      <p className="text-gray-700 text-sm line-clamp-3">{post.text}</p>
      <div className="mt-2 text-xs text-yellow-600 font-bold cursor-pointer hover:underline">Ler entrada completa</div>
    </div>
  );

  const renderMedia = () => {
    if (!post.mediaUrl) return null;
    const url = `${API_URL}${post.mediaUrl}`;
    return (
      <div className="mt-3 -mx-4 md:mx-0 md:rounded-lg overflow-hidden bg-black">
        {post.mediaType === 'video' ?
          <video src={url} controls className="w-full max-h-[500px]" /> :
          <img src={url} className="w-full max-h-[500px] object-contain" />
        }
      </div>
    );
  };

  if (post.repostOf) {
    // ... (Lógica de Repost simplificada para focar no novo conteúdo)
    return <div className="p-4 bg-white shadow rounded mb-4">🔁 Repost de {post.user.name}...</div>
  }

  // HEADER PADRÃO
  const avatarUrl = getAvatarUrl(post.user);

  return (
    <div className={`bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mb-4 ${post.type === 'wiki' ? 'border-t-4 border-t-yellow-400' : ''}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <Link to={`/profile/${post.user._id}`} className="flex items-center gap-3">
            {avatarUrl ? <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" /> : <GenericAvatar user={post.user} />}
            <div>
              <div className="font-bold text-gray-900 text-sm hover:underline">{post.user.name}</div>
              <div className="text-xs text-gray-500 flex gap-2">
                {formatDistanceToNow(new Date(post.createdAt), { locale: ptBR })}
                {post.category && <span className="bg-gray-100 px-1.5 rounded text-gray-600 font-medium">{post.category}</span>}
              </div>
            </div>
          </Link>
          {isOwner && <button onClick={() => onDelete()} className="text-gray-400 hover:text-red-500 text-sm">🗑️</button>}
        </div>

        {/* Conteúdo Variável */}
        {post.type !== 'link' && post.type !== 'wiki' && post.title && <h3 className="font-bold text-lg text-gray-900 mb-1">{post.title}</h3>}
        {post.type === 'blog' && <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{post.text}</p>}

        {post.type === 'poll' && renderPoll()}
        {post.type === 'quiz' && renderQuiz()}
        {post.type === 'link' && renderLink()}
        {post.type === 'wiki' && renderWiki()}

        {renderMedia()}

        {/* Footer Ações */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
          <button onClick={handleReaction} className="flex items-center gap-1 text-gray-600 hover:bg-gray-50 px-2 py-1 rounded transition">
            <HeartIcon filled={!!myReaction} /> <span className="text-sm font-medium">{post.reactions.length}</span>
          </button>
          <button onClick={() => setShowCommentInput(!showCommentInput)} className="flex items-center gap-1 text-gray-600 hover:bg-gray-50 px-2 py-1 rounded transition">
            <CommentIcon /> <span className="text-sm font-medium">{post.comments.length}</span>
          </button>
          <button className="text-gray-400 hover:text-gray-600"><ShareIcon /></button>
        </div>

        {/* Comentários (Simplificado) */}
        {showCommentInput && (
          <form onSubmit={addComment} className="mt-3 flex gap-2">
            <input className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sky-300" placeholder="Escreva um comentário..." value={comment} onChange={e => setComment(e.target.value)} />
            <button type="submit" className="text-sky-600 font-bold text-sm px-2">Enviar</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default React.memo(PostCard);