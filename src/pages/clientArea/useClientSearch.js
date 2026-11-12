import { useCallback, useEffect, useRef, useState } from 'react';
import { ptBR } from '../../feedback/messages/ptBR.js';
import { searchHome } from '../../utils/searchHome';

export function useClientSearch(feedback) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRows, setSearchRows] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const desktopSearchRef = useRef(null);
  const desktopSearchInputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    desktopSearchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const handlePointerDown = (event) => {
      if (desktopSearchRef.current?.contains(event.target)) return;
      setSearchOpen(false);
      setSearchTerm('');
      setSearchRows([]);
      setSearchError('');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [searchOpen]);

  useEffect(() => {
    const clean = String(searchTerm || '').trim();
    let cancelled = false;
    setSearchRows([]);
    setSearchError('');

    if (clean.length < 3) {
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const timeout = window.setTimeout(() => {
      const search = async () => {
        try {
          const rows = await searchHome(clean, { limit: 10 });
          if (cancelled) return;
          setSearchRows(rows);
        } catch (error) {
          if (cancelled) return;
          console.error('Client search error:', error);
          setSearchError(ptBR.clientArea.search_error.body);
          feedback.showMessage('clientArea.search_error');
        } finally {
          if (!cancelled) setSearching(false);
        }
      };
      search();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [feedback, searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchTerm('');
    setSearchRows([]);
    setSearchError('');
  }, []);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setSearchRows([]);
    setSearchError('');
    setSearching(value.trim().length >= 3);
  };

  const toggleDesktopSearch = () => {
    if (searchOpen && !String(searchTerm || '').trim()) {
      setSearchOpen(false);
      setSearchRows([]);
      setSearchError('');
      return;
    }
    setSearchOpen(true);
  };

  return {
    searchOpen,
    searchTerm,
    searchRows,
    searching,
    searchError,
    desktopSearchRef,
    desktopSearchInputRef,
    clearSearch,
    handleSearchChange,
    toggleDesktopSearch,
  };
}
