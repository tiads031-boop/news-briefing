import { useState, useCallback } from 'react';
import type { Story } from '../types';

const STORAGE_KEY = 'news-briefing-bookmarks';

export interface BookmarkItem {
  storyId: string;
  headline: string;
  headlineEn?: string;
  headlineZh?: string;
  topic: string;
  issueDate: string;
  addedAt: string;
}

function loadBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(items: BookmarkItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(loadBookmarks);

  const isBookmarked = useCallback(
    (storyId: string) => bookmarks.some(b => b.storyId === storyId),
    [bookmarks]
  );

  const addBookmark = useCallback((story: Story, issueDate: string) => {
    setBookmarks(prev => {
      if (prev.some(b => b.storyId === story.id)) return prev;
      const item: BookmarkItem = {
        storyId: story.id,
        headline: story.headline,
        headlineEn: story.headlineEn,
        headlineZh: story.headlineZh,
        topic: story.topic,
        issueDate,
        addedAt: new Date().toISOString(),
      };
      const next = [item, ...prev];
      saveBookmarks(next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((storyId: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.storyId !== storyId);
      saveBookmarks(next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback(
    (story: Story, issueDate: string) => {
      if (isBookmarked(story.id)) {
        removeBookmark(story.id);
      } else {
        addBookmark(story, issueDate);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  const clearAll = useCallback(() => {
    setBookmarks([]);
    saveBookmarks([]);
  }, []);

  return {
    bookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearAll,
    count: bookmarks.length,
  };
}
