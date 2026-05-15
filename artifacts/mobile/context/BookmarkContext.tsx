import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Bookmark {
  id: string;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  surahEnglishName: string;
  timestamp: number;
}

export interface LastRead {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  surahEnglishName: string;
}

interface BookmarkContextType {
  bookmarks: Bookmark[];
  lastRead: LastRead | null;
  addBookmark: (bookmark: Omit<Bookmark, "id" | "timestamp">) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  setLastRead: (lastRead: LastRead) => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined
);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [lastRead, setLastReadState] = useState<LastRead | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("quran_bookmarks").then((data) => {
      if (data) {
        try {
          setBookmarks(JSON.parse(data));
        } catch {}
      }
    });
    AsyncStorage.getItem("quran_last_read").then((data) => {
      if (data) {
        try {
          setLastReadState(JSON.parse(data));
        } catch {}
      }
    });
  }, []);

  const addBookmark = useCallback(
    (bookmark: Omit<Bookmark, "id" | "timestamp">) => {
      const newBookmark: Bookmark = {
        ...bookmark,
        id:
          Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      setBookmarks((prev) => {
        const next = [newBookmark, ...prev];
        AsyncStorage.setItem("quran_bookmarks", JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      AsyncStorage.setItem("quran_bookmarks", JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (surahNumber: number, ayahNumber: number) => {
      return bookmarks.some(
        (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
      );
    },
    [bookmarks]
  );

  const setLastRead = useCallback((lr: LastRead) => {
    setLastReadState(lr);
    AsyncStorage.setItem("quran_last_read", JSON.stringify(lr));
  }, []);

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        lastRead,
        addBookmark,
        removeBookmark,
        isBookmarked,
        setLastRead,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx)
    throw new Error("useBookmarks must be used within BookmarkProvider");
  return ctx;
}
