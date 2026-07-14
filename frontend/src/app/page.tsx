"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowDown, Sparkles, Target, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 md:min-h-[calc(100dvh-4rem)]">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-transform hover:scale-110 md:h-14 md:w-14">
          <Sparkles className="h-6 w-6 text-primary md:h-7 md:w-7" />
        </div>

        <h1 className="text-3xl font-bold text-text-primary md:text-4xl">
          Альфа.Старт
        </h1>
        <p className="mt-2 text-base text-gray-500 md:text-lg">
          Интерактивный ИИ-помощник для молодых предпринимателей
        </p>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-gray-400 md:text-base">
          Выберите нишу, рассчитайте бизнес-план за 5 минут и откройте ИП в
          Альфа-Банке — всё в одном месте.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="group cursor-default rounded-lg border border-gray-200 bg-gray-50/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm">
            <Target className="mb-2 h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <h3 className="text-sm font-semibold text-text-primary">Выбор ниши</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              ИИ подберёт идеи под ваш бюджет и город
            </p>
          </div>
          <div className="group cursor-default rounded-lg border border-gray-200 bg-gray-50/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm">
            <Wallet className="mb-2 h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <h3 className="text-sm font-semibold text-text-primary">Бизнес-план</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Расчёт окупаемости, расходов и плана действий
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login">
            <Button size="lg">
              Начать
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() =>
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <ArrowDown className="mr-2 h-4 w-4 animate-bounce" />
            Как это работает
          </Button>
        </div>
      </div>

      <section
        id="how-it-works"
        className="mt-24 w-full max-w-lg border-t border-gray-200 pt-12 text-center"
      >
        <h2 className="text-xl font-bold text-text-primary">Как это работает</h2>
        <p className="mt-2 text-sm text-gray-400">
          Ответьте на несколько вопросов — ИИ сформирует бизнес-план за считанные секунды.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              1
            </div>
            <p className="font-medium text-text-primary">Выберите нишу</p>
          </div>
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              2
            </div>
            <p className="font-medium text-text-primary">Заполните данные</p>
          </div>
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              3
            </div>
            <p className="font-medium text-text-primary">Получите план</p>
          </div>
        </div>
      </section>
    </div>
  );
}
