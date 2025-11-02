export default function SupportPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">Support</h1>
      <p className="text-gray-600 mb-8">
        Heeft u hulp nodig? Neem contact met ons op via de onderstaande manieren.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Veelgestelde vragen</h2>
          <p className="text-gray-600 mb-4">
            Bekijk onze veelgestelde vragen voor snelle antwoorden op veelvoorkomende vragen.
          </p>
          <a href="/help" className="text-primary hover:underline">
            Naar FAQ →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Contact opnemen</h2>
          <p className="text-gray-600 mb-4">
            Kunt u uw vraag niet vinden? Neem dan contact met ons op.
          </p>
          <a href="/contact" className="text-primary hover:underline">
            Contactformulier →
          </a>
        </div>
      </div>
    </div>
  );
}
