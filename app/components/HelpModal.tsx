'use client';

import type { GameType } from './GameSelector';

interface HelpSection {
  heading: string;
  items: string[];
}

interface HelpContent {
  title: string;
  sections: HelpSection[];
}

const HELP_CONTENT: Record<GameType, HelpContent> = {
  x01: {
    title: '301 / 501',
    sections: [
      {
        heading: 'Reglene',
        items: [
          'Hver spiller starter med 301 eller 501 poeng.',
          'Du kaster 3 piler per tur, og poengsummen trekkes fra din gjenværende score.',
          'Med double-out må du avslutte nøyaktig på 0 poeng, og siste pil må være en dobbel (eller bullseye).',
          'Bust: havner du under 0, på nøyaktig 1, eller på 0 uten dobbel når double-out kreves, teller ikke turen — poengsummen din er uendret og det blir neste spillers tur.',
          'Første spiller til å vinne det angitte antallet legs vinner kampen.'
        ]
      },
      {
        heading: 'Sette opp en kamp',
        items: [
          'Legg til spillere, gi dem navn og eventuelt et bilde.',
          'Velg startpoeng (301/501), om double-out skal kreves, og antall legs som skal til for å vinne.'
        ]
      },
      {
        heading: 'Registrere kast manuelt',
        items: [
          'Velg Single, Double eller Triple, og trykk deretter på tallet pilen traff.',
          'Bull (25) og Bullseye (50) har egne knapper.',
          'Bom registrerer 0 poeng.',
          '«Angre denne turen» fjerner pilene i den pågående, ikke ferdige turen.'
        ]
      },
      {
        heading: 'Historikk og kastfordeling',
        items: [
          '«Historikk» viser hver tur, gruppert per leg.',
          '«Kastfordeling» viser en virtuell dartskive per spiller med et merke for hvert kast — enten en farget prikk, eller spillerens eget bilde hvis de har lastet opp et.'
        ]
      },
      {
        heading: 'Avslutte kampen',
        items: ['«Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i kampen forsvinner.']
      }
    ]
  },
  'x01-duo': {
    title: '301 / 501 Duo',
    sections: [
      {
        heading: 'Reglene',
        items: [
          'Spilles akkurat som vanlig 301/501: 3 piler per tur, poengsummen trekkes fra gjenværende score, og double-out krever at siste pil er en dobbel.',
          'Duo-regelen: havner du på nøyaktig samme poengsum som en motstander, sendes motstanderen tilbake til startpoengsummen for legen.',
          'Bust fungerer som vanlig — teller ikke turen, og det blir neste spillers tur.',
          'Første spiller til å vinne det angitte antallet legs vinner kampen.'
        ]
      },
      {
        heading: 'Sette opp en kamp',
        items: [
          'Legg til spillere, gi dem navn og eventuelt et bilde.',
          'Velg startpoeng (301/501), om double-out skal kreves, og antall legs som skal til for å vinne.',
          'Duo-regelen er slått på som standard, men kan skrus av i oppsettet.'
        ]
      },
      {
        heading: 'Registrere kast manuelt',
        items: [
          'Velg Single, Double eller Triple, og trykk deretter på tallet pilen traff.',
          'Bull (25) og Bullseye (50) har egne knapper.',
          'Bom registrerer 0 poeng.',
          '«Angre denne turen» fjerner pilene i den pågående, ikke ferdige turen.'
        ]
      },
      {
        heading: 'Historikk og kastfordeling',
        items: [
          '«Historikk» viser hver tur, gruppert per leg.',
          '«Kastfordeling» viser en virtuell dartskive per spiller med et merke for hvert kast.'
        ]
      },
      {
        heading: 'Avslutte kampen',
        items: ['«Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i kampen forsvinner.']
      }
    ]
  },
  clock: {
    title: 'Rundt klokka',
    sections: [
      {
        heading: 'Reglene',
        items: [
          'Alle spillere starter med mål 1.',
          'Treffer du målet ditt — single, double eller triple teller likt — rykker du fram til neste tall.',
          'Bommer du, er turen din over med én gang, selv om du har piler igjen.',
          'Du kaster maks 3 piler per tur.',
          'Første spiller til å treffe 20 vinner kampen på stedet.'
        ]
      },
      {
        heading: 'Sette opp en kamp',
        items: ['Legg til spillere, gi dem navn og eventuelt et bilde.']
      },
      {
        heading: 'Registrere kast manuelt',
        items: [
          'Velg Single, Double eller Triple (kun for kastfordelingen — alle multiplikatorer teller likt for framgang), og trykk på tallet du traff.',
          'Bom registrerer et bomkast og avslutter turen umiddelbart.'
        ]
      },
      {
        heading: 'Kastfordeling',
        items: ['Viser en virtuell dartskive per spiller med et merke for hvert kast.']
      },
      {
        heading: 'Avslutte kampen',
        items: ['«Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i kampen forsvinner.']
      }
    ]
  },
  cricket: {
    title: 'Cricket',
    sections: [
      {
        heading: 'Reglene',
        items: [
          'Målene er 15, 16, 17, 18, 19, 20 og Bull.',
          'Du lukker et tall med 3 merker: single gir 1 merke, double gir 2, triple gir 3 (Bull har ingen triple — bullseye gir 2 merker).',
          'Har du lukket et tall, og minst én motstander ikke har lukket det ennå, gir ekstra treff på tallet poeng (verdien × antall ekstra merker).',
          'Når alle spillere har lukket et tall, kan ingen lenger score på det.',
          'Du vinner ved å lukke alle tallene og samtidig ha like mange eller flere poeng enn alle andre.'
        ]
      },
      {
        heading: 'Sette opp en kamp',
        items: ['Legg til spillere, gi dem navn og eventuelt et bilde.']
      },
      {
        heading: 'Registrere kast manuelt',
        items: [
          'Velg Single, Double eller Triple, og trykk deretter på 15–20.',
          'Bull (25) og Bullseye (50) har egne knapper.',
          '«Bom / annet felt» brukes når pilen ikke traff et cricket-mål.'
        ]
      },
      {
        heading: 'Tavlen og kastfordeling',
        items: [
          'Tabellen viser hvor mange merker (–, /, X, ⊗) hver spiller har på hvert tall, og poengsummen nederst. Et nedtonet ⊗ betyr at alle spillere har lukket tallet, så ingen kan lenger score der.',
          '«Kastfordeling» viser en virtuell dartskive per spiller med et merke for hvert kast.'
        ]
      },
      {
        heading: 'Avslutte kampen',
        items: ['«Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i kampen forsvinner.']
      }
    ]
  },
  halveit: {
    title: 'Halve-it',
    sections: [
      {
        heading: 'Reglene',
        items: [
          '10 faste runder, hver med sitt eget mål i denne rekkefølgen: 20, Double, 19, Triple, 18, 17, Bull, 16, 15, Double.',
          'Alle spillere kaster 3 piler per runde mot samme mål.',
          'Treffer du målet (med riktig multiplikator der det kreves), legges poengsummen til totalen din.',
          'Bommer du helt på målet i en runde — ingen av de 3 pilene treffer — halveres hele poengsummen din (rundet ned).',
          'Høyest poengsum etter alle 10 rundene vinner. Er det uavgjort på toppen, deler de involverte seieren.'
        ]
      },
      {
        heading: 'Sette opp en kamp',
        items: ['Legg til spillere, gi dem navn og eventuelt et bilde.']
      },
      {
        heading: 'Registrere kast manuelt',
        items: [
          'Velg Single, Double eller Triple, og trykk på tallet pilen traff.',
          'I en «Double»-runde teller kun doble treff, uansett hvilket tall. Tilsvarende for «Triple».',
          'I en «Bull»-runde teller både vanlig Bull (25) og Bullseye (50).'
        ]
      },
      {
        heading: 'Kastfordeling',
        items: ['Viser en virtuell dartskive per spiller med et merke for hvert kast.']
      },
      {
        heading: 'Avslutte kampen',
        items: ['«Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i kampen forsvinner.']
      }
    ]
  },
  highlow: {
    title: 'High-Low',
    sections: [
      {
        heading: 'Reglene',
        items: [
          'Hver runde kaster alle spillere 3 piler hver.',
          'Høyest sum for runden vinner ett rundepoeng.',
          'Er det nøyaktig uavgjort om toppscoren, får ingen poeng den runden.',
          'Første spiller til å nå det angitte antallet rundeseiere vinner kampen.'
        ]
      },
      {
        heading: 'Sette opp en kamp',
        items: [
          'Legg til spillere, gi dem navn og eventuelt et bilde.',
          'Velg hvor mange rundeseiere som skal til for å vinne kampen.'
        ]
      },
      {
        heading: 'Registrere kast manuelt',
        items: [
          'Velg Single, Double eller Triple, og trykk deretter på tallet pilen traff.',
          'Bull (25) og Bullseye (50) har egne knapper.',
          'Bom registrerer 0 poeng.'
        ]
      },
      {
        heading: 'Kastfordeling',
        items: ['Viser en virtuell dartskive per spiller med et merke for hvert kast.']
      },
      {
        heading: 'Avslutte kampen',
        items: ['«Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i kampen forsvinner.']
      }
    ]
  }
};

export function HelpModal({ game, onClose }: { game: GameType; onClose: () => void }) {
  const content = HELP_CONTENT[game];
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>Hvordan {content.title} fungerer</h2>
          <button className="btn help-close" onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </div>

        {content.sections.map(section => (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            <ul>
              {section.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
