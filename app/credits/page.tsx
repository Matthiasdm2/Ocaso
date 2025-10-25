import CreditsWidget from '@/components/CreditsWidget';

export default function CreditsPage() {
  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Ocaso Credits
          </h1>
          <p className="text-gray-600">
            Koop credits om QR-codes te genereren voor betalingen bij Ocaso Shops.
            Perfect voor het testen van Stripe betalingen met je eigen producten.
          </p>
        </div>

        <CreditsWidget />
      </div>
    </div>
  );
}
