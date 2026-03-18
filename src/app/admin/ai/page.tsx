export default function AdminAIPage() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Configuration</h1>
      <p className="text-gray-500 mb-8">Manage the Print Expert AI assistant knowledge base and behaviour.</p>

      <div className="space-y-4">
        {[
          {
            title: 'Knowledge base',
            desc: 'Add product tips, material specs, FAQ entries, and custom rules that the AI uses when answering customers.',
            status: 'Coming soon',
          },
          {
            title: 'System prompt override',
            desc: 'Customise the core instructions given to the AI — tone, language defaults, fallback messages.',
            status: 'Coming soon',
          },
          {
            title: 'Conversation logs',
            desc: 'Review past chat sessions, identify common questions, and refine AI responses.',
            status: 'Coming soon',
          },
          {
            title: 'File analysis rules',
            desc: 'Set minimum DPI, bleed requirements, and accepted formats per product category.',
            status: 'Coming soon',
          },
        ].map((item) => (
          <div key={item.title} className="border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4 bg-white">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold bg-gray-100 text-gray-400 px-2 py-1 rounded-full uppercase tracking-wide">
              {item.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">Currently active:</strong> Print Expert uses the live product catalog
          from the database as context. To extend its knowledge, the knowledge base editor will be available here
          in the next phase.
        </p>
      </div>
    </div>
  )
}
