"use client";

import { Message } from "ai";
import { RefObject, useEffect, useState } from "react";

export const useChatScrollAnchor = (
  chats: Message[],
  ref: RefObject<HTMLDivElement>
) => {
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Update isAtBottom whenever the user scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;

      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      const atBottomOfChat = scrollTop + clientHeight >= scrollHeight - 1; // Allow a small margin
      setIsAtBottom(atBottomOfChat);
    };

    if (ref.current) {
      ref.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [ref]);

  // Scroll to the bottom if isAtBottom is true
  useEffect(() => {
    if (isAtBottom && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [chats, ref, isAtBottom]);

  // Function to programmatically reset to the bottom
  const resetToBottom = () => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
    setIsAtBottom(true);
  };

  return { isAtBottom, resetToBottom };
};
