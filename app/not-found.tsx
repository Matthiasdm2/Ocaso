export default function NotFound() {
  return (
    <div className="container py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">Pagina niet gevonden</h1>
      <p className="text-gray-600">
        Ga terug naar de{" "}
        <a href="/" className="underline">
          homepagina
        </a>
        .
      </p>
    </div>
  );
}
