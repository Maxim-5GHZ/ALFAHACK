import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">
                AC
              </span>
              Альфа.Старт
            </Link>
            <p className="mt-2 text-xs text-gray-400 leading-relaxed max-w-[240px]">
              Интерактивный ИИ-помощник для молодых предпринимателей. Оцените конкурентов, сформируйте смету и откройте безопасное дело.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary/60 mb-3">Продукты</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-xs text-gray-400 hover:text-primary transition-colors">Главная</Link></li>
              <li><Link href="/login" className="text-xs text-gray-400 hover:text-primary transition-colors">Цифровой консультант</Link></li>
              <li><Link href="/login" className="text-xs text-gray-400 hover:text-primary transition-colors">Бизнес-план</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary/60 mb-3">Помощь</h4>
            <ul className="space-y-2">
              <li><span className="text-xs text-gray-400">Служба поддержки</span></li>
              <li><span className="text-xs text-gray-400">8 800 234-56-78</span></li>
              <li><span className="text-xs text-gray-400">help@alfastart.ru</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-2 text-xs text-gray-400 md:flex-row md:justify-between">
          <p>&copy; {new Date().getFullYear()} Альфа.Старт. Все права защищены.</p>
          <p>Сделано для молодых предпринимателей</p>
        </div>
      </div>
    </footer>
  );
}
