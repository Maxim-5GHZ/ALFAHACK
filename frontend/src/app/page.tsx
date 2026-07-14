import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Target, Wallet } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 md:min-h-[calc(100dvh-4rem)]">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 md:h-14 md:w-14">
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
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 text-left">
            <Target className="mb-2 h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Выбор ниши</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              ИИ подберёт идеи под ваш бюджет и город
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 text-left">
            <Wallet className="mb-2 h-5 w-5 text-primary" />
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
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" asChild>
            <a href="#how-it-works">Как это работает</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
