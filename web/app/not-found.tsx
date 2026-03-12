import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
        <span className="text-4xl font-bold text-primary">404</span>
      </div>
      <h1
        className="text-3xl font-bold text-foreground mb-2"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Page Not Found
      </h1>
      <p className="text-muted max-w-sm mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center px-4 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-surface transition-colors"
        >
          Find Experts
        </Link>
      </div>
    </div>
  );
}
