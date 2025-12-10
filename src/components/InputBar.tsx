
import React, { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

interface InputBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({ onSubmit, isLoading }) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value);
    }
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6B26D9] to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
        <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl p-2">
          <div className="pl-4 pr-3 text-[#6B26D9]">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 font-medium py-3"
            placeholder="Describe a physics scenario..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className={`
              ml-2 p-3 rounded-xl flex items-center justify-center transition-all duration-200
              ${isLoading || !value.trim() 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-[#6B26D9] text-white hover:bg-[#7e3af2] shadow-lg shadow-[#6B26D9]/25 hover:scale-105 active:scale-95'}
            `}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
};
