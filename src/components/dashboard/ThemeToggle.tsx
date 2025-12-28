import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useResQStore } from '@/store/useResQStore';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useResQStore();

  return (
    <motion.button
      onClick={toggleTheme}
      className="p-3 bg-lime-brand border-4 border-black dark:border-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-1 hover:translate-y-1 transition-all"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      {isDarkMode ? (
        <Sun className="w-6 h-6 text-black" strokeWidth={2.5} />
      ) : (
        <Moon className="w-6 h-6 text-black" strokeWidth={2.5} />
      )}
    </motion.button>
  );
}
