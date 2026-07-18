"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowDown,
  Sparkles,
  Wallet,
  Users,
  ShieldCheck,
  MapPin,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col bg-white min-h-[calc(100dvh-4rem)]">
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
            <Sparkles className="h-6 w-6 md:h-7 md:w-7 text-primary animate-pulse" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
            Бизнес-старт без рутины и страхов для молодых
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
            Интерактивный ИИ-помощник для предпринимателей от 17 до 25 лет. Оцените конкурентов, сформируйте смету и откройте безопасное дело.
          </p>

          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary-dark px-8 rounded-xl shadow-md font-bold">
                Запустить ассистента
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-gray-300 rounded-xl text-text-primary hover:bg-gray-50"
              onClick={() =>
                document.getElementById("why-needed")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <ArrowDown className="mr-2 h-4 w-4 animate-bounce" />
              Почему мы?
            </Button>
          </div>
        </div>
      </section>

      <section id="why-needed" className="py-12 md:py-16 bg-gray-50/50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <span className="text-[10px] md:text-[11px] font-bold tracking-widest uppercase text-primary bg-primary/5 px-3 py-1 rounded-full">
              Реальные боли — Простые решения
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mt-4">
              Почему молодые предприниматели выбирают нас?
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              Мы выявили преграды, которые останавливают 80% молодежи на этапе идеи.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-red-100 text-primary">
                  <Wallet size={20} />
                </div>
                <h3 className="text-sm md:text-base font-bold text-text-primary">Маленький стартовый капитал</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-text-primary font-semibold">Проблема:</strong> Кажется, что нужны миллионы. <br />
                <strong className="text-primary font-semibold">Решение:</strong> ИИ рассчитывает смету под бюджет, а мы подберем стартап-овердрафт или кредит под 4.5%.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-sm md:text-base font-bold text-text-primary">Страх налоговой</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-text-primary font-semibold">Проблема:</strong> Нет понимания, как подавать декларации. <br />
                <strong className="text-primary font-semibold">Решение:</strong> «Умный Автопилот» резервирует налог с каждой транзакции, исключая кассовые разрывы.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <Users size={20} />
                </div>
                <h3 className="text-sm md:text-base font-bold text-text-primary">Конфликты сооснователей</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-text-primary font-semibold">Проблема:</strong> Риск несправедливого распределения денег. <br />
                <strong className="text-primary font-semibold">Решение:</strong> «Альфа.Тандем» обеспечивает автоматическое сплитование выручки на счета партнеров.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-green-100 text-green-600">
                  <MapPin size={20} />
                </div>
                <h3 className="text-sm md:text-base font-bold text-text-primary">Непонимание рынка</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-text-primary font-semibold">Проблема:</strong> Страшно открыться там, где много конкурентов. <br />
                <strong className="text-primary font-semibold">Решение:</strong> Интеграция с картами считает количество точек в городе, оценивая плотность.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary">Простой путь к запуску</h2>
          <p className="text-sm text-gray-500 mt-2">Три шага, которые превратят идею в план</p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary shadow-sm">1</div>
              <h4 className="text-sm font-bold text-text-primary mt-4">Обсудите боли</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">Расскажите ИИ-консультанту о своих опасениях и планах.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary shadow-sm">2</div>
              <h4 className="text-sm font-bold text-text-primary mt-4">Изучите аналитику</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">Получите точный расчет конкурентов и цен аренды.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary shadow-sm">3</div>
              <h4 className="text-sm font-bold text-text-primary mt-4">Ведите чек-лист</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">Выполняйте задачи для открытия ИП и ведения дел.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
