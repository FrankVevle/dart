'use client';

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>Hvordan spillet fungerer</h2>
          <button className="btn help-close" onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </div>

        <section>
          <h3>Reglene</h3>
          <ul>
            <li>Hver spiller starter med 301 eller 501 poeng.</li>
            <li>Du kaster 3 piler per tur, og poengsummen trekkes fra din gjenværende score.</li>
            <li>
              Med <strong>double-out</strong> må du avslutte nøyaktig på 0 poeng, og siste pil må være en dobbel (eller
              bullseye).
            </li>
            <li>
              <strong>Bust</strong>: havner du under 0, på nøyaktig 1, eller på 0 uten dobbel når double-out kreves, teller
              ikke turen — poengsummen din er uendret og det blir neste spillers tur.
            </li>
            <li>Første spiller til å vinne det angitte antallet legs vinner kampen.</li>
          </ul>
        </section>

        <section>
          <h3>Sette opp en kamp</h3>
          <ul>
            <li>Legg til spillere, gi dem navn og eventuelt et bilde.</li>
            <li>Velg startpoeng (301/501), om double-out skal kreves, og antall legs som skal til for å vinne.</li>
          </ul>
        </section>

        <section>
          <h3>Registrere kast manuelt</h3>
          <ul>
            <li>Velg Single, Double eller Triple, og trykk deretter på tallet pilen traff.</li>
            <li>Bull (25) og Bullseye (50) har egne knapper.</li>
            <li>Bom registrerer 0 poeng.</li>
            <li>«Angre denne turen» fjerner pilene i den pågående, ikke ferdige turen.</li>
          </ul>
        </section>

        <section>
          <h3>Historikk og kastfordeling</h3>
          <ul>
            <li>«Historikk» viser hver tur, gruppert per leg.</li>
            <li>
              «Kastfordeling» viser en virtuell dartskive per spiller med et merke for hvert kast — enten en farget prikk,
              eller spillerens eget bilde hvis de har lastet opp et.
            </li>
          </ul>
        </section>

        <section>
          <h3>Avslutte kampen</h3>
          <p>
            «Avslutt kamp» er den eneste veien tilbake til spilleroppsettet. Den ber om bekreftelse siden fremgangen i
            kampen forsvinner.
          </p>
        </section>
      </div>
    </div>
  );
}
