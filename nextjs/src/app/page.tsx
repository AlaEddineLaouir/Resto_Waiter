import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center">
          <div className="text-6xl mb-6">🍽️</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Menu AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            AI-powered menu assistant for restaurants. Help your customers discover dishes,
            get recommendations, and learn about ingredients with natural conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Try Demo Chat
            </Link>
            <Link
              href="/platform"
              className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
            >
              Platform Admin
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Natural Conversation
            </h3>
            <p className="text-gray-600">
              Customers can ask questions in natural language about dishes, ingredients,
              dietary restrictions, and get personalized recommendations.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Multi-Tenant SaaS
            </h3>
            <p className="text-gray-600">
              Each restaurant gets their own branded experience with custom menus,
              settings, and subdomain access.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-4">🔧</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              MCP Integration
            </h3>
            <p className="text-gray-600">
              Built with Model Context Protocol for seamless AI tool integration,
              allowing the assistant to query menu data in real-time.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Sign Up', desc: 'Create your restaurant account' },
              { step: 2, title: 'Add Menu', desc: 'Import or create your menu items' },
              { step: 3, title: 'Customize', desc: 'Set up branding and preferences' },
              { step: 4, title: 'Go Live', desc: 'Share the chat link with customers' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step}
                </div>
                <h4 className="font-semibold text-gray-800 mb-1">{title}</h4>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center bg-teal-600 rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Menu Experience?
          </h2>
          <p className="text-teal-100 mb-8 max-w-2xl mx-auto">
            Join restaurants using AI to help customers discover their perfect meal.
          </p>
          <Link
            href="/chat"
            className="inline-block px-8 py-4 bg-white text-teal-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white mt-24">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500">
          <p>© 2024 Menu AI. Built with Next.js, Vercel AI SDK, and MCP.</p>
        </div>
      </footer>
    </div>
  );
}
