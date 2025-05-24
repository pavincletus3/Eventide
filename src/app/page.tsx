
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center text-center space-y-8 py-12">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Welcome to Eventide
        </h1>
        <p className="text-lg md:text-xl text-foreground max-w-2xl mx-auto">
          Your premier platform for discovering, creating, and managing memorable events. Let's make something happen!
        </p>
      </div>

      <Image
        src="https://placehold.co/800x400.png"
        alt="People enjoying an event"
        width={800}
        height={400}
        className="rounded-lg shadow-xl object-cover"
        data-ai-hint="event concert"
        priority
      />

      <div className="space-x-4">
        <Button asChild size="lg">
          <Link href="/#explore">Explore Events</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/#create">Create an Event</Link>
        </Button>
      </div>

      <div className="w-full max-w-4xl pt-12">
        <h2 className="text-3xl font-semibold mb-6 text-foreground">Featured Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-card p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Image
                src={`https://placehold.co/600x400.png?id=${index+1}`}
                alt={`Featured event ${index + 1}`}
                width={600}
                height={400}
                className="rounded-md mb-4 object-cover aspect-[3/2]"
                data-ai-hint="community festival"
              />
              <h3 className="text-xl font-semibold mb-2 text-primary">Event Title {index + 1}</h3>
              <p className="text-muted-foreground text-sm mb-1">Sat, Aug 24, 10:00 AM</p>
              <p className="text-muted-foreground text-sm mb-3">Community Park</p>
              <p className="text-foreground text-sm mb-4">
                A brief description of this amazing event that you definitely don't want to miss.
              </p>
              <Button variant="secondary" className="w-full">Learn More</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
