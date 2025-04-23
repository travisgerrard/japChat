import React from "react";

interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  kanji?: string;
  srs_level: number;
  next_review: string;
  chat_message_id?: string;
}

export default function VocabRow({ item }: { item: VocabItem }) {
  return (
    <tr className="border-b">
      <td className="p-2">{item.word}</td>
      <td className="p-2">{item.reading}</td>
      <td className="p-2">{item.meaning}</td>
      <td className="p-2">{item.kanji || "-"}</td>
      <td className="p-2">{item.srs_level}</td>
      <td className="p-2">{item.next_review ? new Date(item.next_review).toLocaleDateString() : "-"}</td>
      <td className="p-2">
        {item.chat_message_id ? (
          <a href={`/chat/context/${item.chat_message_id}`} className="text-blue-600 hover:underline">View in Chat</a>
        ) : "-"}
      </td>
    </tr>
  );
} 