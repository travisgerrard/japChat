import SRSReview from "./SRSReview";

export default function ReviewPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">SRS Review</h1>
      <SRSReview />
    </div>
  );
} 