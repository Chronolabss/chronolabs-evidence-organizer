export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10">
      
      <h1 className="text-5xl font-bold mb-6">
        ChronoLabs
      </h1>

      <p className="text-xl text-gray-300 mb-10 text-center max-w-2xl">
        AI-Powered Evidence & Timeline Organizer
      </p>

      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-3xl">
        
        <h2 className="text-2xl font-semibold mb-4">
          Project Status
        </h2>

        <ul className="space-y-3 text-gray-300">
          <li>✅ Next.js Environment Installed</li>
          <li>✅ GitHub Repository Connected</li>
          <li>✅ Local Development Server Running</li>
          <li>✅ ChronoLabs Project Initialized</li>
        </ul>

        <button className="mt-8 bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition">
          Create Timeline
        </button>

      </div>

    </main>
  );
}
