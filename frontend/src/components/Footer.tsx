import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#0B1F35]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-6 text-center text-xs text-gray-400 md:flex-row md:justify-between md:py-8">
        <p>&copy; {new Date().getFullYear()} Альфа.Старт</p>
        <p>
          Сделано для молодых предпринимателей
          <span className="mx-1.5">&middot;</span>
          <Link href="/" className="transition-colors hover:text-white">
            alfahack.ru
          </Link>
        </p>
      </div>
    </footer>
  );
}
