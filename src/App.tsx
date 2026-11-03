import { useEffect, useRef, useState } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  RouterProvider,
  useLoaderData,
  useOutletContext,
  useParams,
} from "react-router-dom";
import "./App.css";

type UiCustomization = {
  theme: {
    id: string;
    name: string;
    mode: "light" | "dark";
    accent: string;
  };
  localization: {
    locale: string;
    language: string;
    dateFormat: string;
    numberFormat: string;
  };
  activeLogo: {
    id: string;
    name: string;
    mark: string;
    alt: string;
  };
};

type MicroExecutor = {
  id: string;
  title: string;
  description: string;
  url: string;
  apis: ApiDefinition[];
  dataSources: DataSource[];
};

type DataSource = {
  id: string;
  title: string;
  type: string;
  description: string;
};

type ApiDefinition = {
  id: string;
  description: string;
  microExecutorId: string;
};

type ApplicationDomain = {
  id: string;
  title: string;
  description: string;
  microExecutorIds: string[];
  uiCustomization: UiCustomization;
};

type DomainConfiguration = {
  schemaVersion: number;
  environments: ApplicationDomain[];
};

type MicroExecutorConfiguration = {
  schemaVersion: number;
  microExecutors: MicroExecutor[];
};

type ApplicationConfiguration = {
  environments: ApplicationDomain[];
  microExecutors: MicroExecutor[];
};

type EnvironmentContext = {
  environment: ApplicationDomain;
  microExecutors: MicroExecutor[];
};

type JsonDialogProps = {
  title: string;
  id: string;
  value: unknown;
  onClose: () => void;
};

const analysisCases = [
  {
    path: "single-domain",
    title: "Caso A · Un solo dominio",
    description:
      "Un'istanza di Grain contiene un solo dominio applicativo, che riunisce i programmi e i micro executor rappresentati.",
    progression:
      "Partiamo dal caso più semplice: un solo dominio raccoglie le UPP e i data source dei loro micro executor. Non dobbiamo ancora distinguere ciò che è comune da ciò che è specifico di altri domini.",
    nextQuestion:
      "Come cambia il modello quando Grain contiene più domini con programmi diversi?",
    programs:
      "Le UPP A e B sono entrambe associate al dominio A. Non esiste un secondo dominio con cui confrontare o condividere i programmi.",
    data: "I data source sono associati ai micro executor responsabili, non direttamente alle UPP. Un micro executor può essere collegato a più data source.",
    example:
      "Nello schema UPP A usa mex A e mex B, ciascuno collegato a un database; UPP B usa mex C, collegato a due database.",
    comparisonPrograms: "UPP in un unico dominio",
    comparisonData: "Data source dei micro executor del dominio",
    image: "img/case-a.png",
    imageAlt: "Un dominio con UPP A e B, tre micro executor e quattro database",
  },
  {
    path: "multiple-heterogeneous-domains",
    title: "Caso B · Domini diversi, UPP distinte",
    description:
      "Grain contiene domini di natura diversa, con insiemi di programmi distinti per ciascun dominio.",
    progression:
      "Introduciamo più domini: rispetto al caso A, ciascuno ha le proprie UPP e i propri data source. In questo esempio i programmi non sono condivisi tra domini.",
    nextQuestion:
      "E se due domini avessero bisogno degli stessi programmi, ma di dati diversi?",
    programs:
      "Nell'esempio il dominio A contiene UPP A e B, mentre il dominio B contiene UPP C e D. Nessuna UPP è rappresentata in entrambi i domini.",
    data: "Ogni dominio vede i data source dei micro executor associati alle proprie UPP. Lo schema mostra database distinti, senza collegamenti ai database dell'altro dominio.",
    example:
      "UPP B nel dominio A usa mex C, collegato a due database; UPP C nel dominio B usa mex D, collegato a un database.",
    comparisonPrograms: "UPP distinte per dominio",
    comparisonData: "Data source distinti nello schema",
    image: "img/case-b.png",
    imageAlt:
      "Due domini con UPP e micro executor distinti, collegati ai rispettivi database",
  },
  {
    path: "multiple-homogeneous-domains",
    title: "Caso C · Stesse UPP, dati distinti",
    description:
      "Grain contiene domini della stessa natura: utilizzano gli stessi programmi, ma operano su dati distinti.",
    progression:
      "Rispetto al caso B, le UPP diventano comuni: i domini usano le stesse istanze dei mex, con connessioni ai rispettivi data source. Qui entrambe le UPP sono condivise.",
    nextQuestion:
      "Come rappresentare domini che condividono solo una parte delle UPP e ne hanno anche di specifiche?",
    programs:
      "Le UPP A e B sono condivise dai domini A e B: ciascuna usa la stessa istanza dei propri micro executor in entrambi i domini.",
    data: "La stessa istanza del micro executor usa parametri di connessione diversi a seconda del dominio. Nel disegno il dominio A usa db A e db B, mentre il dominio B usa db C e db D.",
    example:
      "UPP A usa la stessa istanza di mex A nei due domini: con i parametri del dominio A si collega a db A, con quelli del dominio B a db C.",
    comparisonPrograms: "Stesse UPP e istanze mex condivise",
    comparisonData: "Parametri e data source distinti per dominio",
    image: "img/case-c.png",
    imageAlt:
      "Due domini con le stesse UPP A e B e database diversi per ogni dominio",
  },
  {
    path: "shared-and-specific-upp",
    title: "Caso D · UPP condivise e specifiche",
    description:
      "Grain contiene domini che utilizzano alcuni programmi in comune e altri specifici, con dati distinti per dominio.",
    progression:
      "Il punto di arrivo combina i casi precedenti: più domini, UPP e istanze mex condivise dove servono, UPP specifiche dove necessario e data source distinti per dominio.",
    nextQuestion:
      "Le UPP comuni riutilizzano le stesse istanze dei mex; i parametri di connessione selezionano i data source del dominio. Le UPP specifiche completano le esigenze dei singoli domini.",
    programs:
      "UPP A e B sono condivise dai due domini e usano le stesse istanze dei rispettivi micro executor; UPP C è specifica del dominio A e UPP D del dominio B.",
    data: "I micro executor delle UPP condivise usano parametri di connessione diversi per accedere ai data source del dominio corrente. I database delle UPP specifiche sono mostrati separatamente.",
    example:
      "La stessa istanza di mex A usa i parametri del dominio A per collegarsi a db A e quelli del dominio B per db C. UPP C è collegata a db E, mentre UPP D è collegata a db F.",
    comparisonPrograms: "UPP e istanze mex comuni, più UPP specifiche",
    comparisonData: "Parametri e data source distinti per dominio",
    image: "img/case-d.png",
    imageAlt:
      "Due domini con UPP A e B comuni, UPP C e D specifiche e database distinti",
  },
];

async function loadConfiguration(): Promise<ApplicationConfiguration> {
  const [domainsResponse, microExecutorsResponse] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/application-domains.json`),
    fetch(`${import.meta.env.BASE_URL}data/micro-executors.json`),
  ]);

  if (!domainsResponse.ok || !microExecutorsResponse.ok) {
    throw new Error("Impossibile caricare la configurazione degli ambienti.");
  }

  const [domainConfiguration, microExecutorConfiguration] = await Promise.all([
    domainsResponse.json() as Promise<DomainConfiguration>,
    microExecutorsResponse.json() as Promise<MicroExecutorConfiguration>,
  ]);

  return {
    environments: domainConfiguration.environments,
    microExecutors: microExecutorConfiguration.microExecutors,
  };
}

function AppShell() {
  const configuration = useLoaderData() as ApplicationConfiguration;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link
            className="brand"
            to="/"
            aria-label="Dominio applicativo, pagina iniziale"
          >
            <span className="brand-mark" aria-hidden="true">
              DA
            </span>
            <span className="brand-name">Dominio applicativo</span>
          </Link>
          <div className="topbar-meta">
            <span className="status-dot" aria-hidden="true" />
            <span>Dati mock</span>
            <span className="meta-divider" aria-hidden="true" />
            <span>POC</span>
          </div>
        </div>
      </header>
      <Outlet context={configuration} />
    </div>
  );
}

function EnvironmentSelection() {
  const { environments } = useOutletContext<ApplicationConfiguration>();

  return (
    <main className="site-main">
      <p className="eyebrow page-eyebrow">Configurazione / ambienti</p>
      <div className="page-heading">
        <div>
          <h1>Scegli un ambiente</h1>
          <p className="page-intro">
            Apri un ambiente applicativo per consultare il dominio e la
            configurazione associata.
          </p>
        </div>
        <div className="page-heading-actions">
          <div className="environment-total">
            <span>{String(environments.length).padStart(2, "0")}</span>
            <span>ambienti disponibili</span>
          </div>
          <Link className="analysis-button" to="/analisi">
            Analisi
          </Link>
        </div>
      </div>

      <div className="section-rule">
        <span>Domini registrati</span>
        <span>Seleziona per entrare</span>
      </div>

      <div className="environment-grid">
        {environments.map((environment, index) => (
          <Link
            className="environment-card"
            key={environment.id}
            to={`/applicative-domain/${environment.id}`}
          >
            <div className="environment-card-top">
              <span className="environment-id">{environment.id}</span>
              <span className="environment-index">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="environment-card-copy">
              <h2>{environment.title}</h2>
              <p>{environment.description}</p>
            </div>
            <div className="environment-card-action">
              Apri ambiente <span aria-hidden="true">-&gt;</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function AnalysisLayout() {
  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">Tutti gli ambienti</Link>
        <span aria-hidden="true">/</span>
        <span>Analisi</span>
      </div>
      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu analisi">
          <div>
            <p className="sidebar-caption">Percorso di analisi</p>
            <p className="analysis-sidebar-intro">
              Dal dominio unico al modello con UPP condivise e specifiche. Sono
              passaggi del ragionamento, non fasi obbligatorie di migrazione.
            </p>
          </div>
          <nav className="sidebar-nav">
            <NavLink
              className={({ isActive }) =>
                `sidebar-link${isActive ? " is-active" : ""}`
              }
              to="concetti-fondamentali"
              end
            >
              <span className="sidebar-link-marker" aria-hidden="true" />
              Concetti fondamentali
            </NavLink>
            {analysisCases.map((analysisCase) => (
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                key={analysisCase.path}
                to={analysisCase.path}
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                {analysisCase.title}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="environment-outlet">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

function AnalysisConceptsPage() {
  return (
    <section aria-labelledby="analysis-concepts-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Percorso di analisi · Introduzione</p>
          <h1 id="analysis-concepts-heading">Concetti fondamentali in Grain</h1>
        </div>
      </div>
      <p className="page-intro analysis-intro">
        Prima di confrontare i casi, definiamo come si collegano UPP,
        funzionalità, programmi, microservizi e data source nel modello
        considerato.
      </p>
      <div className="analysis-facts">
        <section className="analysis-fact" aria-labelledby="concept-upp">
          <h2 id="concept-upp">UPP · Insieme di funzionalità</h2>
          <p>
            L'UPP definisce un gruppo di funzionalità che permettono di
            risolvere un problema di business. Queste funzionalità sono offerte
            da uno o più programmi, realizzati in uno o più microservizi. Il
            rapporto non è necessariamente uno a uno: uno stesso microservizio
            può contenere programmi che offrono funzionalità per una o più UPP.
          </p>
        </section>
        <section className="analysis-fact" aria-labelledby="concept-data">
          <h2 id="concept-data">
            Data source · Responsabilità del microservizio
          </h2>
          <p>
            Un data source è associato a un microservizio responsabile. Secondo
            il principio database per servizio, gli altri microservizi non
            accedono direttamente allo stesso data source. Un microservizio può
            essere responsabile di più data source.
          </p>
        </section>
        <section className="analysis-fact" aria-labelledby="concept-example">
          <h2 id="concept-example">Esempio · Gestione del magazzino</h2>
          <p>
            La UPP di gestione del magazzino raggruppa, ad esempio, le
            funzionalità di carico, scarico e consultazione delle giacenze,
            offerte da programmi distinti. Tali programmi possono trovarsi in
            uno o più microservizi; uno di questi può anche ospitare programmi
            che offrono funzionalità per un&apos;altra UPP.
          </p>
        </section>
      </div>
      <img
        className="analysis-image"
        src={`${import.meta.env.BASE_URL}/img/er-upp.png`}
      />
      <p className="analysis-note">
        Se una UPP è condivisa tra domini, questi usano le stesse istanze dei
        microservizi coinvolti, con parametri di connessione specifici per
        dominio. La condivisione non trasferisce la responsabilità dei data
        source ad altri microservizi. Questa è una regola architetturale
        dell&apos;analisi; la POC non ne verifica l&apos;applicazione.
      </p>
      <nav
        className="analysis-step-navigation"
        aria-label="Navigazione nel percorso di analisi"
      >
        <Link to={`/analisi/${analysisCases[0].path}`}>
          <span>Inizia il percorso</span>
          {analysisCases[0].title}
        </Link>
      </nav>
    </section>
  );
}

function AnalysisCasePage({
  analysisCase,
}: {
  analysisCase: (typeof analysisCases)[number];
}) {
  const caseIndex = analysisCases.findIndex(
    (item) => item.path === analysisCase.path,
  );
  const previousCase = analysisCases[caseIndex - 1];
  const nextCase = analysisCases[caseIndex + 1];

  return (
    <section aria-labelledby="analysis-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">
            Percorso di analisi · Passo {caseIndex + 1} di{" "}
            {analysisCases.length}
          </p>
          <h1 id="analysis-heading">{analysisCase.title}</h1>
        </div>
      </div>
      <p className="page-intro analysis-intro">{analysisCase.description}</p>
      <section
        className="analysis-progression"
        aria-labelledby="analysis-progression-heading"
      >
        <h2 id="analysis-progression-heading">
          {caseIndex === 0
            ? "Il punto di partenza"
            : nextCase
              ? "Il passo nel ragionamento"
              : "Il punto di arrivo"}
        </h2>
        <p>{analysisCase.progression}</p>
        <p className="analysis-progression-next">
          <strong>
            {nextCase ? "La domanda successiva: " : "La sintesi: "}
          </strong>
          {analysisCase.nextQuestion}
        </p>
        {nextCase && (
          <Link to={`/analisi/${nextCase.path}`}>
            Prosegui: {nextCase.title} <span aria-hidden="true">-&gt;</span>
          </Link>
        )}
      </section>
      <div className="analysis-facts">
        <section className="analysis-fact" aria-labelledby="analysis-programs">
          <h2 id="analysis-programs">UPP · Programmi</h2>
          <p>{analysisCase.programs}</p>
        </section>
        <section className="analysis-fact" aria-labelledby="analysis-data">
          <h2 id="analysis-data">Dati · Data source</h2>
          <p>{analysisCase.data}</p>
        </section>
        <section className="analysis-fact" aria-labelledby="analysis-example">
          <h2 id="analysis-example">Come leggere lo schema</h2>
          <p>{analysisCase.example}</p>
        </section>
      </div>
      <p className="analysis-note">
        Negli schemi, le UPP raggruppano funzionalità offerte da programmi nei
        mex. I mex sono micro executor responsabili dei propri data source, ai
        quali gli altri microservizi non accedono direttamente. Una UPP
        condivisa usa la stessa istanza dei suoi mex nei diversi domini, con
        parametri di connessione specifici per dominio. Nei casi C e D i mex
        ripetuti nel disegno rappresentano quindi la stessa istanza, non copie
        distinte. La condivisione del programma non implica quella dei dati; gli
        schemi non specificano come siano applicati i permessi di accesso o
        l&apos;isolamento.
      </p>
      <img
        className="analysis-image"
        src={`${import.meta.env.BASE_URL}${analysisCase.image}`}
        alt={analysisCase.imageAlt}
      />
      <nav
        className="analysis-step-navigation"
        aria-label="Navigazione nel percorso di analisi"
      >
        <Link
          to={
            previousCase
              ? `/analisi/${previousCase.path}`
              : "/analisi/concetti-fondamentali"
          }
        >
          <span>{previousCase ? "Passo precedente" : "Introduzione"}</span>
          {previousCase ? previousCase.title : "Concetti fondamentali"}
        </Link>
        {nextCase && (
          <Link to={`/analisi/${nextCase.path}`}>
            <span>Passo successivo</span>
            {nextCase.title}
          </Link>
        )}
      </nav>
      <section
        className="analysis-comparison"
        aria-labelledby="analysis-comparison-heading"
      >
        <h2 id="analysis-comparison-heading">Confronto tra i casi</h2>
        <div className="analysis-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Caso</th>
                <th scope="col">UPP · Programmi</th>
                <th scope="col">Dati · Data source</th>
              </tr>
            </thead>
            <tbody>
              {analysisCases.map((item) => (
                <tr key={item.path}>
                  <th scope="row">
                    <Link to={`/analisi/${item.path}`}>{item.title}</Link>
                  </th>
                  <td>{item.comparisonPrograms}</td>
                  <td>{item.comparisonData}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function EnvironmentLayout() {
  const configuration = useOutletContext<ApplicationConfiguration>();
  const { environmentId } = useParams();
  const environment = configuration.environments.find(
    (item) => item.id === environmentId,
  );
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  if (!environment) {
    return <NotFoundPage />;
  }

  const environmentContext: EnvironmentContext = {
    environment,
    microExecutors: configuration.microExecutors.filter((microExecutor) =>
      environment.microExecutorIds.includes(microExecutor.id),
    ),
  };

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">Tutti gli ambienti</Link>
        <span aria-hidden="true">/</span>
        <span>{environment.id}</span>
      </div>

      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu ambiente">
          <section
            className="environment-summary-card"
            aria-labelledby="environment-title"
          >
            <p className="eyebrow">Ambiente applicativo</p>
            <h1 id="environment-title">{environment.title}</h1>
            <button
              className="json-trigger"
              type="button"
              onClick={() => setIsJsonOpen(true)}
            >
              Mostra JSON
            </button>
          </section>
          <div className="environment-sidebar-menu">
            <p className="sidebar-caption">Menu ambiente</p>
            <nav className="sidebar-nav">
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="dettaglio"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Dettaglio
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="api"
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                API
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="data-sources"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Data sources
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="ui-personalizzazione"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                UI e personalizzazione
              </NavLink>
            </nav>
          </div>
        </aside>

        <div className="environment-outlet">
          <Outlet context={environmentContext} />
        </div>
      </div>
      {isJsonOpen && (
        <JsonDialog
          title={environment.title}
          id={environment.id}
          value={environment}
          onClose={() => setIsJsonOpen(false)}
        />
      )}
    </main>
  );
}

function MicroExecutorLayout() {
  const configuration = useOutletContext<ApplicationConfiguration>();
  const { microExecutorId } = useParams();
  const microExecutor = configuration.microExecutors.find(
    (item) => item.id === microExecutorId,
  );
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  if (!microExecutor) {
    return <NotFoundPage />;
  }

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">Tutti gli ambienti</Link>
        <span aria-hidden="true">/</span>
        <span>{microExecutor.id}</span>
      </div>

      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu micro executor">
          <section
            className="environment-summary-card"
            aria-labelledby="micro-executor-title"
          >
            <p className="eyebrow">Micro executor</p>
            <h1 id="micro-executor-title">{microExecutor.title}</h1>
            <button
              className="json-trigger"
              type="button"
              onClick={() => setIsJsonOpen(true)}
            >
              Mostra JSON
            </button>
          </section>
          <div className="environment-sidebar-menu">
            <p className="sidebar-caption">Menu micro executor</p>
            <nav className="sidebar-nav">
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="dettaglio"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Dettaglio
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="api"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                API
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="data-sources"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Data sources
              </NavLink>
            </nav>
          </div>
        </aside>

        <div className="environment-outlet">
          <Outlet context={microExecutor} />
        </div>
      </div>
      {isJsonOpen && (
        <JsonDialog
          title={microExecutor.title}
          id={microExecutor.id}
          value={microExecutor}
          onClose={() => setIsJsonOpen(false)}
        />
      )}
    </main>
  );
}

function JsonDialog({ title, id, value, onClose }: JsonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      aria-labelledby="json-dialog-title"
      className="json-dialog"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <div className="json-dialog-header">
        <div>
          <p className="eyebrow">Configurazione / JSON</p>
          <h2 id="json-dialog-title">{title}</h2>
          <span className="json-dialog-id">{id}</span>
        </div>
        <button className="json-dialog-close" type="button" onClick={onClose}>
          Chiudi
        </button>
      </div>
      <pre className="json-code">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </dialog>
  );
}

function EnvironmentDetail() {
  const { environment } = useOutletContext<EnvironmentContext>();

  return (
    <section className="detail-view" aria-labelledby="detail-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo</p>
          <h2 id="detail-heading">Dettaglio</h2>
        </div>
        <span className="detail-format">Documento JSON</span>
      </div>

      <dl className="detail-list">
        <div className="detail-row">
          <dt>ID</dt>
          <dd className="detail-value detail-id">{environment.id}</dd>
        </div>
        <div className="detail-row">
          <dt>Title</dt>
          <dd className="detail-value">{environment.title}</dd>
        </div>
        <div className="detail-row">
          <dt>Description</dt>
          <dd className="detail-value detail-description">
            {environment.description}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function MicroExecutorsPage() {
  const { environment, microExecutors } =
    useOutletContext<EnvironmentContext>();

  return (
    <section className="micro-executors-view" aria-label="Micro executors">
      <p className="page-intro micro-executors-intro">
        Micro servizi referenziati dal dominio applicativo {environment.title}.
      </p>
      <div className="micro-executor-list">
        {microExecutors.map((microExecutor) => (
          <Link
            className="micro-executor-card"
            key={microExecutor.id}
            to={`/micro-executors/${microExecutor.id}`}
          >
            <div className="micro-executor-card-top">
              <span className="environment-id">{microExecutor.id}</span>
              <span className="micro-executor-api-count">
                {microExecutor.apis.length} API
              </span>
            </div>
            <h3>{microExecutor.title}</h3>
            <p>{microExecutor.description}</p>
            <div className="micro-executor-card-action">
              <span className="micro-executor-url">{microExecutor.url}</span>
              <span>
                Apri <span aria-hidden="true">-&gt;</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MicroExecutorDetail() {
  const microExecutor = useOutletContext<MicroExecutor>();

  return (
    <section
      className="detail-view"
      aria-labelledby="micro-executor-detail-heading"
    >
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Configurazione micro executor</p>
          <h2 id="micro-executor-detail-heading">Dettaglio</h2>
        </div>
        <span className="detail-format">{microExecutor.apis.length} API</span>
      </div>
      <dl className="detail-list">
        <div className="detail-row">
          <dt>ID</dt>
          <dd className="detail-value detail-id">{microExecutor.id}</dd>
        </div>
        <div className="detail-row">
          <dt>Title</dt>
          <dd className="detail-value">{microExecutor.title}</dd>
        </div>
        <div className="detail-row">
          <dt>Description</dt>
          <dd className="detail-value detail-description">
            {microExecutor.description}
          </dd>
        </div>
        <div className="detail-row">
          <dt>URL</dt>
          <dd className="detail-value micro-executor-url">
            {microExecutor.url}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function MicroExecutorApis() {
  const microExecutor = useOutletContext<MicroExecutor>();

  return (
    <section
      className="micro-executor-apis"
      aria-labelledby="micro-executor-api-heading"
    >
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Servizi associati</p>
          <h2 id="micro-executor-api-heading">API</h2>
        </div>
        <span className="detail-format">
          {String(microExecutor.apis.length).padStart(2, "0")} servizi
        </span>
      </div>
      <div className="api-list">
        {microExecutor.apis.map((api) => (
          <dl className="api-row" key={api.id}>
            <div>
              <dt>ID</dt>
              <dd className="detail-value detail-id">{api.id}</dd>
            </div>
            <div>
              <dt>Descrizione</dt>
              <dd className="detail-value">{api.description}</dd>
            </div>
            <div>
              <dt>Micro executor</dt>
              <dd className="detail-value api-executor-id">
                {api.microExecutorId}
              </dd>
            </div>
          </dl>
        ))}
      </div>
    </section>
  );
}

function DataSourcesList({
  microExecutors,
}: {
  microExecutors: MicroExecutor[];
}) {
  const entries = microExecutors.flatMap((microExecutor) =>
    microExecutor.dataSources.map((dataSource) => ({
      dataSource,
      microExecutor,
    })),
  );

  if (entries.length === 0) {
    return <p className="page-intro">Nessun data source associato.</p>;
  }

  return (
    <div className="api-list">
      {entries.map(({ dataSource, microExecutor }) => (
        <dl className="api-row" key={`${microExecutor.id}-${dataSource.id}`}>
          <div>
            <dt>Data source</dt>
            <dd className="detail-value">{dataSource.title}</dd>
            <dd className="detail-value detail-id">{dataSource.id}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd className="detail-value">{dataSource.type}</dd>
            <dd className="detail-value">{dataSource.description}</dd>
          </div>
          <div>
            <dt>Micro executor responsabile</dt>
            <dd className="detail-value">
              <Link
                className="data-source-owner"
                to={`/micro-executors/${microExecutor.id}/data-sources`}
              >
                {microExecutor.title}
              </Link>
            </dd>
            <dd className="detail-value api-executor-id">{microExecutor.id}</dd>
          </div>
        </dl>
      ))}
    </div>
  );
}

function EnvironmentDataSources() {
  const { environment, microExecutors } =
    useOutletContext<EnvironmentContext>();

  return (
    <section aria-labelledby="data-sources-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo</p>
          <h2 id="data-sources-heading">Data sources</h2>
        </div>
      </div>
      <p className="page-intro api-intro">
        Data source ereditati dai micro servizi associati al dominio applicativo{" "}
        {environment.title}.
      </p>
      <DataSourcesList microExecutors={microExecutors} />
    </section>
  );
}

function MicroExecutorDataSources() {
  const microExecutor = useOutletContext<MicroExecutor>();

  return (
    <section aria-labelledby="data-sources-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Configurazione micro executor</p>
          <h2 id="data-sources-heading">Data sources</h2>
        </div>
      </div>
      <p className="page-intro api-intro">
        Data source di cui {microExecutor.title} &egrave; responsabile.
      </p>
      <DataSourcesList microExecutors={[microExecutor]} />
    </section>
  );
}

function ApiPage() {
  const environmentContext = useOutletContext<EnvironmentContext>();
  const { microExecutors } = environmentContext;
  const apiCount = microExecutors.reduce(
    (count, microExecutor) => count + microExecutor.apis.length,
    0,
  );

  return (
    <section className="api-view" aria-labelledby="api-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Logica applicativa</p>
          <h2 id="api-heading">API</h2>
        </div>
      </div>
      <nav className="api-tabs" aria-label="Viste API">
        <NavLink
          className={({ isActive }) => `api-tab${isActive ? " is-active" : ""}`}
          to="servizi"
          end
        >
          Servizi
          <span className="api-tab-count">{apiCount}</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `api-tab${isActive ? " is-active" : ""}`}
          to="micro-executors"
          end
        >
          Micro executors
          <span className="api-tab-count">{microExecutors.length}</span>
        </NavLink>
      </nav>
      <Outlet context={environmentContext} />
    </section>
  );
}

function ApiServicesPage() {
  const { environment, microExecutors } =
    useOutletContext<EnvironmentContext>();
  const apis = microExecutors.flatMap((microExecutor) => microExecutor.apis);

  return (
    <section className="api-services-view" aria-label="Servizi API">
      <p className="page-intro api-intro">
        API contenute nei micro executors associati al dominio applicativo{" "}
        {environment.title}.
      </p>
      <div className="api-list">
        {apis.map((api) => (
          <dl className="api-row" key={`${api.microExecutorId}-${api.id}`}>
            <div>
              <dt>ID</dt>
              <dd className="detail-value detail-id">{api.id}</dd>
            </div>
            <div>
              <dt>Descrizione</dt>
              <dd className="detail-value">{api.description}</dd>
            </div>
            <div>
              <dt>Micro executor</dt>
              <dd className="detail-value api-executor-id">
                {api.microExecutorId}
              </dd>
            </div>
          </dl>
        ))}
      </div>
    </section>
  );
}

function UiPersonalizationPage() {
  const { environment } = useOutletContext<EnvironmentContext>();
  const { theme, localization, activeLogo } = environment.uiCustomization;

  return (
    <section
      className="ui-personalization-view"
      aria-labelledby="ui-personalization-heading"
    >
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Configurazione del dominio</p>
          <h2 id="ui-personalization-heading">UI e personalizzazione</h2>
        </div>
      </div>
      <div className="ui-settings">
        <section
          className="ui-setting-row"
          aria-labelledby="theme-setting-heading"
        >
          <h3 id="theme-setting-heading">Tema</h3>
          <dl className="ui-setting-details">
            <div>
              <dt>Tema attivo</dt>
              <dd>{theme.name}</dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd className="detail-id">{theme.id}</dd>
            </div>
            <div>
              <dt>Modalit&agrave;</dt>
              <dd>{theme.mode === "light" ? "Chiaro" : "Scuro"}</dd>
            </div>
            <div>
              <dt>Colore di accento</dt>
              <dd className="ui-theme-color">
                <span
                  aria-hidden="true"
                  className="ui-theme-swatch"
                  style={{ backgroundColor: theme.accent }}
                />
                <span className="detail-id">{theme.accent}</span>
              </dd>
            </div>
          </dl>
        </section>
        <section
          className="ui-setting-row"
          aria-labelledby="localization-setting-heading"
        >
          <h3 id="localization-setting-heading">Localizzazione</h3>
          <dl className="ui-setting-details">
            <div>
              <dt>Lingua</dt>
              <dd>{localization.language}</dd>
            </div>
            <div>
              <dt>Locale</dt>
              <dd className="detail-id">{localization.locale}</dd>
            </div>
            <div>
              <dt>Formato data</dt>
              <dd className="detail-id">{localization.dateFormat}</dd>
            </div>
            <div>
              <dt>Formato numeri</dt>
              <dd className="detail-id">{localization.numberFormat}</dd>
            </div>
          </dl>
        </section>
        <section
          className="ui-setting-row"
          aria-labelledby="logo-setting-heading"
        >
          <h3 id="logo-setting-heading">Logo attivo</h3>
          <div className="ui-active-logo">
            <div
              className="ui-active-logo-mark"
              role="img"
              aria-label={activeLogo.alt}
            >
              {activeLogo.mark}
            </div>
            <div className="ui-active-logo-copy">
              <p>{activeLogo.name}</p>
              <span className="ui-active-label">
                <span className="status-dot" aria-hidden="true" />
                Attivo
              </span>
              <span className="detail-id">{activeLogo.id}</span>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function ConfigurationLoading() {
  return (
    <main className="site-main message-page" aria-live="polite">
      <p className="eyebrow">Configurazione / ambienti</p>
      <h1>Caricamento dati</h1>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="site-main message-page">
      <p className="eyebrow">Ambiente non trovato</p>
      <h1>Configurazione non disponibile</h1>
      <p className="page-intro">
        L'ambiente richiesto non &egrave; presente tra i domini configurati.
      </p>
      <Link className="message-link" to="/">
        Torna agli ambienti
      </Link>
    </main>
  );
}

function ConfigurationError() {
  return (
    <main className="site-main message-page">
      <p className="eyebrow">Errore di configurazione</p>
      <h1>Dati non disponibili</h1>
      <p className="page-intro">
        Non &egrave; stato possibile caricare i dati degli ambienti.
      </p>
      <a className="message-link" href={import.meta.env.BASE_URL}>
        Ricarica la pagina
      </a>
    </main>
  );
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      loader: loadConfiguration,
      HydrateFallback: ConfigurationLoading,
      element: <AppShell />,
      errorElement: <ConfigurationError />,
      children: [
        { index: true, element: <EnvironmentSelection /> },
        {
          path: "analisi",
          element: <AnalysisLayout />,
          children: [
            {
              index: true,
              element: <Navigate to="concetti-fondamentali" replace />,
            },
            {
              path: "concetti-fondamentali",
              element: <AnalysisConceptsPage />,
            },
            ...analysisCases.map((analysisCase) => ({
              path: analysisCase.path,
              element: <AnalysisCasePage analysisCase={analysisCase} />,
            })),
          ],
        },
        {
          path: "micro-executors/:microExecutorId",
          element: <MicroExecutorLayout />,
          children: [
            { index: true, element: <Navigate to="dettaglio" replace /> },
            { path: "dettaglio", element: <MicroExecutorDetail /> },
            { path: "api", element: <MicroExecutorApis /> },
            { path: "data-sources", element: <MicroExecutorDataSources /> },
          ],
        },
        {
          path: "applicative-domain/:environmentId",
          element: <EnvironmentLayout />,
          children: [
            { index: true, element: <Navigate to="dettaglio" replace /> },
            { path: "dettaglio", element: <EnvironmentDetail /> },
            { path: "data-sources", element: <EnvironmentDataSources /> },
            {
              path: "api",
              element: <ApiPage />,
              children: [
                { index: true, element: <Navigate to="servizi" replace /> },
                { path: "servizi", element: <ApiServicesPage /> },
                { path: "micro-executors", element: <MicroExecutorsPage /> },
              ],
            },
            {
              path: "ui-personalizzazione",
              element: <UiPersonalizationPage />,
            },
          ],
        },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
