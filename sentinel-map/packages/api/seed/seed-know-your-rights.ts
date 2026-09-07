/**
 * Seeds general, jurisdiction-agnostic "know your rights" content.
 *
 * This is intentionally generic, widely-published constitutional-rights
 * information (the kind found on ACLU-style educational material) - not
 * jurisdiction-specific legal advice. State-specific nuance (e.g. stop-and-
 * identify statutes, consent-search rules) varies enough that it belongs in
 * a state-specific row added separately, ideally reviewed by a local
 * immigration/civil-rights attorney before publishing - see docs/LEGAL.md.
 *
 * Usage:
 *   ts-node seed/seed-know-your-rights.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ENTRIES = [
  {
    state: "FEDERAL",
    language: "en",
    title: "Your rights during a law enforcement encounter (general, U.S.)",
    body: `This is general information, not legal advice - rights and local
procedure vary by state and situation. If you need help with a specific
case, contact a local legal aid organization (see the Legal Aid tab).

- You have the right to remain silent. You can say: "I am exercising my
  right to remain silent."
- You do not have to consent to a search of yourself, your car, or your
  home. You can say: "I do not consent to a search." Officers may still
  search you if they have a warrant or legal authority to do so regardless
  of your consent - saying no preserves your rights either way.
- If you are not under arrest, you generally have the right to calmly ask
  "Am I free to leave?" and to leave if the answer is yes.
- You have the right to an attorney. If you can't afford one and are
  arrested, one will be appointed. You can say: "I want to speak to a
  lawyer."
- You generally have the right to record law enforcement in public. Some
  states restrict recording in specific circumstances - check local rules.
- If you believe your rights were violated, try to remember details (badge
  numbers, patrol car numbers, time and location) and contact a legal aid
  organization or civil-rights attorney afterward.`,
  },
  {
    state: "FEDERAL",
    language: "es",
    title: "Sus derechos durante un encuentro con las fuerzas del orden (general, EE. UU.)",
    body: `Esta es información general, no asesoría legal - los derechos y
procedimientos locales varían según el estado y la situación. Si necesita
ayuda con un caso específico, comuníquese con una organización de ayuda
legal local (vea la pestaña de Ayuda Legal).

- Tiene derecho a permanecer en silencio. Puede decir: "Estoy ejerciendo mi
  derecho a permanecer en silencio."
- No tiene que dar su consentimiento para que registren su persona, su
  vehículo o su hogar. Puede decir: "No doy mi consentimiento para un
  registro." Los oficiales aún pueden registrar si tienen una orden judicial
  o autoridad legal para hacerlo, independientemente de su consentimiento -
  decir que no preserva sus derechos de cualquier manera.
- Si no está bajo arresto, generalmente tiene derecho a preguntar con calma
  "¿Soy libre de irme?" y a irse si la respuesta es sí.
- Tiene derecho a un abogado. Si no puede pagar uno y es arrestado, se le
  asignará uno. Puede decir: "Quiero hablar con un abogado."
- Generalmente tiene derecho a grabar a las fuerzas del orden en público.
  Algunos estados restringen la grabación en circunstancias específicas -
  verifique las reglas locales.
- Si cree que se violaron sus derechos, trate de recordar detalles (números
  de placa, números de patrulla, hora y lugar) y comuníquese después con una
  organización de ayuda legal o un abogado de derechos civiles.`,
  },
];

async function main() {
  for (const entry of ENTRIES) {
    await prisma.knowYourRightsContent.upsert({
      where: { state_language: { state: entry.state, language: entry.language } },
      update: { title: entry.title, body: entry.body },
      create: entry,
    });
  }
  console.log(`Seeded ${ENTRIES.length} know-your-rights entries.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
