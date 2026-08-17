import React, { useState, useEffect, useRef } from "react";
import { db } from "../db/localDb";
import { UserProfile, TaskComment } from "../types";
import { Send, Trash2, Pin, MessageSquare } from "lucide-react";

interface TaskCommentsProps {
  taskId: string;
  currentUser: UserProfile;
  language?: "ar" | "en";
  onNavigateToView?: (view: string, targetId?: string) => void;
}

const roleColor = (role: string) => {
  switch (role) {
    case "Super Admin": return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
    case "Vice": return "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
    case "Coordinator": return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    case "Leader": return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    default: return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  }
};

const isAdmin = (role: string) =>
  ["Super Admin", "Vice", "Coordinator", "Deputy Coordinator"].includes(role);

const CommentBubble: React.FC<{
  comment: TaskComment;
  currentUser: UserProfile;
  ar: boolean;
  onDelete: () => void;
  onPin?: () => void;
  isPinnedSection?: boolean;
  onNavigateToView?: (view: string, targetId?: string) => void;
}> = ({ comment, currentUser, ar, onDelete, onPin, isPinnedSection, onNavigateToView }) => {
  const isOwn = comment.authorId === currentUser.id;
  const canDelete = isOwn || isAdmin(currentUser.role);
  const time = new Date(comment.createdAt).toLocaleTimeString(ar ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const day = new Date(comment.createdAt).toLocaleDateString(ar ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
  const authorUser = db.getUsers().find(u => u.id === comment.authorId);

  return (
    <div className={`flex gap-2 items-start group ${isPinnedSection ? "bg-amber-50 dark:bg-amber-950/20 rounded-xl px-2 py-1.5 border border-amber-200/50 dark:border-amber-900/30" : ""}`}>
      <img
        src={authorUser?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.authorName)}`}
        className="w-6 h-6 rounded-full shrink-0 border border-slate-200 dark:border-slate-700 mt-0.5 object-cover cursor-pointer hover:opacity-80 transition-opacity"
        alt=""
        onClick={() => onNavigateToView?.('profile', comment.authorId)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span 
            className="text-[10px] font-black text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
            onClick={() => onNavigateToView?.('profile', comment.authorId)}
          >
            {comment.authorName}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${roleColor(comment.authorRole)}`}>{comment.authorRole}</span>
          {isPinnedSection && <Pin className="w-2.5 h-2.5 text-amber-500" />}
          <span className="text-[9px] text-slate-400 ms-auto">{day} · {time}</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium break-words">{comment.text}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onPin && (
          <button onClick={onPin} className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 text-amber-500 transition-colors" title={ar ? "تثبيت" : "Pin"}>
            <Pin className="w-3 h-3" />
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-red-400 transition-colors" title={ar ? "حذف" : "Delete"}>
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, currentUser, language = "ar", onNavigateToView }) => {
  const ar = language === "ar";
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => setComments(db.getTaskComments(taskId));

  useEffect(() => {
    load();
    const unsub = db.onChange(load);
    return () => unsub();
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    db.addTaskComment(taskId, currentUser, text);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const pinned = comments.filter(c => c.isPinned);
  const regular = comments.filter(c => !c.isPinned);

  return (
    <div className="flex flex-col gap-3" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          {ar ? `التعليقات (${comments.length})` : `Comments (${comments.length})`}
        </h4>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-2">
          {pinned.map(c => (
            <CommentBubble key={c.id} comment={c} currentUser={currentUser} ar={ar}
              onDelete={() => db.deleteTaskComment(c.id, currentUser.id)}
              onPin={() => db.pinTaskComment(c.id, false)}
              isPinnedSection
              onNavigateToView={onNavigateToView}
            />
          ))}
        </div>
      )}

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {regular.length === 0 && pinned.length === 0 ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-600 text-xs font-semibold">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {ar ? "لا توجد تعليقات بعد — كن أول من يعلّق!" : "No comments yet — be the first!"}
          </div>
        ) : regular.map(c => (
          <CommentBubble key={c.id} comment={c} currentUser={currentUser} ar={ar}
            onDelete={() => db.deleteTaskComment(c.id, currentUser.id)}
            onPin={isAdmin(currentUser.role) ? () => db.pinTaskComment(c.id, true) : undefined}
            onNavigateToView={onNavigateToView}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 mt-1">
        <img
          src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`}
          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
          alt=""
        />
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={ar ? "اكتب تعليقاً... (Enter للإرسال)" : "Write a comment... (Enter to send)"}
            className="w-full resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-eye-brand transition-colors pe-9 font-semibold"
            style={{ minHeight: 36, maxHeight: 80 }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="absolute end-2 bottom-2 p-1 rounded-lg text-eye-brand hover:bg-eye-brand hover:text-white transition-all disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
