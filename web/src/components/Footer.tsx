export function Footer() {
  return (
    <footer className="mt-10 border-t border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-600">
      Proyecto de Ricardo Vögeli – GitHub:{' '}
      <a
        href="https://github.com/risuiar"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-600 hover:underline"
      >
        @risuiar
      </a>{' '}
      -{' '}
      <a
        href="https://codecrypto.academy/"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-600 hover:underline"
      >
        codecrypto.academy
      </a>
    </footer>
  );
}
