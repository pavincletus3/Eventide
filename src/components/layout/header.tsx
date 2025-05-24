
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <CalendarDays className="h-7 w-7" />
          <span>Eventide</span>
        </Link>
        <nav>
          {/* Navigation links can be added here in the future */}
          {/* Example:
          <Link href="/events" className="text-foreground hover:text-primary transition-colors">
            Events
          </Link>
          */}
        </nav>
      </div>
    </header>
  );
};

export default Header;
