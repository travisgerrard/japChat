import SRSReview from "./SRSReview";
import Link from "next/link";

export default function ReviewPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#f9f6f2' }}>
      <header className="w-full max-w-3xl flex items-center justify-between px-6 py-4 bg-white/80 rounded-b-xl shadow mb-8">
        <Link href="/" className="text-lg font-bold text-indigo-600 hover:underline flex items-center">
          <span className="mr-2">←</span> Jap-Chat
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">SRS Review</h1>
        <div />
      </header>
      <SRSReview />
    </div>
  );
} 