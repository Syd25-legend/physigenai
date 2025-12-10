
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, GraduationCap, Link as LinkIcon, MessageCircle, Send, BrainCircuit } from 'lucide-react';

interface ExplanationPanelProps {
  title: string;
  content: string;
  sources?: { title: string; uri: string }[];
  onAskQuestion?: (question: string) => void;
  isAnswering?: boolean;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({ 
  title, 
  content, 
  sources, 
  onAskQuestion, 
  isAnswering = false 
}) => {
  const [question, setQuestion] = useState("");

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && onAskQuestion) {
      onAskQuestion(question);
      setQuestion("");
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-5 h-5 text-[#6B26D9]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6B26D9]">Physics Analysis</span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-tight">{title}</h2>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        
        {/* Feynman Thinking Visual */}
        {isAnswering && (
          <div className="absolute inset-0 z-20 bg-zinc-900/90 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300">
             <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-t-4 border-[#6B26D9] animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-4 border-purple-400 animate-spin reverse duration-1000"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BrainCircuit className="w-10 h-10 text-purple-200 animate-pulse" />
                </div>
             </div>
             <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#6B26D9] to-purple-400 animate-pulse">
               Consulting Feynman...
             </h3>
             <p className="text-zinc-400 text-sm mt-2">Deriving first principles</p>
          </div>
        )}

        <div className="prose prose-invert prose-purple max-w-none">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h3 className="text-xl font-bold text-white mt-6 mb-4" {...props} />,
              h2: ({node, ...props}) => <h4 className="text-lg font-semibold text-zinc-200 mt-5 mb-3" {...props} />,
              p: ({node, ...props}) => <p className="text-zinc-400 leading-relaxed mb-4" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 text-zinc-400 mb-4" {...props} />,
              li: ({node, ...props}) => <li className="mb-2" {...props} />,
              code: ({node, className, children, ...props}) => {
                const match = /language-(\w+)/.exec(className || '')
                return !className ? (
                  <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-[#d8b4fe] font-mono text-sm" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {content || "No explanation available."}
          </ReactMarkdown>
        </div>

        {/* Sources Section */}
        {sources && sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-800">
             <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
               <LinkIcon className="w-4 h-4 text-[#6B26D9]" />
               Sources & References
             </h4>
             <ul className="space-y-2">
               {sources.map((source, idx) => (
                 <li key={idx} className="text-sm">
                   <a 
                     href={source.uri} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-[#a78bfa] hover:text-white hover:underline truncate block transition-colors"
                     title={source.title}
                   >
                     {source.title}
                   </a>
                 </li>
               ))}
             </ul>
          </div>
        )}
      </div>

      {/* Feynman Tutor Input */}
      {onAskQuestion && (
        <div className="p-4 bg-zinc-800/50 border-t border-zinc-800 z-30">
           <form onSubmit={handleAsk} className="relative">
             <div className="flex items-center gap-2 mb-2">
               <MessageCircle className="w-4 h-4 text-[#6B26D9]" />
               <span className="text-xs font-medium text-zinc-300">Ask Feynman about this code</span>
             </div>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={question}
                 onChange={(e) => setQuestion(e.target.value)}
                 placeholder="e.g. Why does it slow down?"
                 className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#6B26D9] transition-colors"
                 disabled={isAnswering}
               />
               <button 
                 type="submit" 
                 disabled={isAnswering || !question.trim()}
                 className="bg-[#6B26D9] hover:bg-[#7e3af2] text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
               >
                 <Send className="w-4 h-4 group-active:translate-x-0.5 transition-transform" />
               </button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
};
