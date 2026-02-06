"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Route } from "lucide-react";

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id as string;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Trip Details
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Trip ID: {tripId}
            </p>
          </div>
          <button
            onClick={() => router.push("/sales-tracking/trips")}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trips
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
          <Route className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-gray-300">
            Trip started successfully.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed view is coming soon. For now, you can track trips from the list page.
          </p>
        </div>
      </div>
    </div>
  );
}
