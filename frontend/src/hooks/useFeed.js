// frontend/src/hooks/useFeed.js
import { useReducer, useCallback } from 'react';
import { api } from '../api';

const feedReducer = (state, action) => {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, posts: action.payload.posts, hasMore: action.payload.hasMore, page: 1 };
        case 'FETCH_MORE_SUCCESS':
            return { ...state, loading: false, posts: [...state.posts, ...action.payload.posts], hasMore: action.payload.hasMore, page: state.page + 1 };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'ADD_POST':
            return { ...state, posts: [action.payload, ...state.posts] };
        case 'UPDATE_POST':
            return { ...state, posts: state.posts.map(p => p._id === action.payload._id ? { ...p, ...action.payload } : p) };
        case 'REMOVE_POST':
            return { ...state, posts: state.posts.filter(p => p._id !== action.payload) };
        default:
            throw new Error(`Ação não tratada: ${action.type}`);
    }
};

// Agora aceita communityId como segundo argumento
export const useFeed = (limit = 10, communityId = null) => {
    const [state, dispatch] = useReducer(feedReducer, { posts: [], loading: true, error: null, page: 1, hasMore: true });

    const fetchPosts = useCallback(async (isInitial = true) => {
        dispatch({ type: 'FETCH_START' });
        try {
            const pageToFetch = isInitial ? 1 : state.page + 1;
            // Adiciona o filtro de comunidade na URL se existir
            const query = `/posts?page=${pageToFetch}&limit=${limit}${communityId ? `&community=${communityId}` : ''}`;

            const { data } = await api.get(query);
            const hasMore = data.length === limit;
            dispatch({ type: isInitial ? 'FETCH_SUCCESS' : 'FETCH_MORE_SUCCESS', payload: { posts: data, hasMore } });
        } catch (err) {
            dispatch({ type: 'FETCH_ERROR', payload: 'Não foi possível carregar o feed.' });
        }
    }, [state.page, limit, communityId]);

    const addPost = useCallback((post) => dispatch({ type: 'ADD_POST', payload: post }), []);
    const updatePost = useCallback((post) => dispatch({ type: 'UPDATE_POST', payload: post }), []);
    const removePost = useCallback((postId) => dispatch({ type: 'REMOVE_POST', payload: postId }), []);

    return { ...state, fetchPosts, addPost, updatePost, removePost };
};