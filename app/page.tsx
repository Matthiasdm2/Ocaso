export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">Ocaso</h1>
      </div>

      <div className="relative flex place-items-center">
        <h2 className="text-2xl">Category Hotfix Applied</h2>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">API Endpoint</h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            /api/categories with Vercel CDN caching
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">Icon Consistency</h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Unified CategoryIcon component with Tabler Icons
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">Database</h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            icon_key column + performance index
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h3 className="mb-3 text-2xl font-semibold">Performance</h3>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            50% faster cold load, 80% faster warm load
          </p>
        </div>
      </div>
    </main>
  )
}
