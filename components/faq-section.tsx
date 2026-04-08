import { Reveal } from "@/components/reveal";

const faqs = [
  {
    question: "À qui s’adresse cette préparation ?",
    answer:
      "La préparation est pensée exclusivement pour les élèves de 2ème bac qui veulent un accompagnement plus structuré, plus clair et plus orienté résultats.",
  },
  {
    question: "Comment se fait le choix du groupe ?",
    answer:
      "Le professeur répartit les élèves entre bon niveau et niveau à renforcer afin de garder un rythme cohérent et une progression plus rapide pour chaque groupe.",
  },
  {
    question: "Quels formats de cours sont proposés ?",
    answer:
      "Le site permet de réserver en mini groupe, en cours individuel ou en ligne selon l’organisation retenue par le professeur.",
  },
  {
    question: "Le professeur se déplace-t-il ?",
    answer:
      "Oui, l’organisation n’est pas liée à un centre fixe. Le fonctionnement se fait directement avec le professeur selon le groupe, la ville et le format choisi.",
  },
];

export function FaqSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">FAQ</p>
        <h2 className="mt-4 font-heading text-3xl font-semibold text-white sm:text-4xl">
          Les réponses utiles avant de réserver
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        {faqs.map((item, index) => (
          <Reveal
            key={item.question}
            delay={index * 90}
            className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-7"
          >
            <h3 className="text-xl font-semibold text-white">{item.question}</h3>
            <p className="mt-3 leading-7 text-slate-300">{item.answer}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
