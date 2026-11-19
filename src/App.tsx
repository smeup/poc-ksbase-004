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
  useRevalidator,
  useRouteError,
  type LoaderFunctionArgs,
} from "react-router-dom";
import { parseDomainCapacities } from "./domain-capacity";
import { getDomainHealth, parseHealthChecks } from "./health-check";
import {
  getConfigurationValue,
  getSchemaProperties,
  type JsonSchema,
  type JsonValue,
} from "./schema-properties";
import { collectPackageEntities, validatePackageEntities, type PackageEntity } from "./package-entities";
import "./App.css";

const GRAIN_TITLE = "Smeup SI";

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
  packageConfigurationSchemas: Record<string, JsonSchema>;
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
  packageIds: string[];
};

type Package = {
  id: string;
  title: string;
  description: string;
  microExecutorIds: string[];
  installed: boolean;
  entities: PackageEntity[];
};

type Authorization = {
  key: string;
  allowed: boolean;
};

type PackageConfigurationValues = { [key: string]: JsonValue };

type ApplicationDomain = {
  id: string;
  title: string;
  description: string;
  packageConfigurations: Record<string, PackageConfigurationValues>;
  authorizations: Authorization[];
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

type PackageConfiguration = {
  schemaVersion: number;
  packages: Package[];
};

type ApplicationConfiguration = {
  environments: ApplicationDomain[];
  microExecutors: MicroExecutor[];
  packages: Package[];
};

type EnvironmentContext = {
  environment: ApplicationDomain;
  packages: Package[];
  microExecutors: MicroExecutor[];
};

type MicroExecutorContext = {
  microExecutor: MicroExecutor;
  packages: Package[];
};

type PackageContext = {
  pkg: Package;
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
    path: "shared-and-specific-pkg",
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
  const [domainsResponse, microExecutorsResponse, packagesResponse] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/application-domains.json`),
    fetch(`${import.meta.env.BASE_URL}data/micro-executors.json`),
    fetch(`${import.meta.env.BASE_URL}data/packages.json`),
  ]);

  if (!domainsResponse.ok || !microExecutorsResponse.ok || !packagesResponse.ok) {
    throw new Error("Impossibile caricare la configurazione dei domini applicativi.");
  }

  const [domainConfiguration, microExecutorConfiguration, packageConfiguration] = await Promise.all([
    domainsResponse.json() as Promise<DomainConfiguration>,
    microExecutorsResponse.json() as Promise<MicroExecutorConfiguration>,
    packagesResponse.json() as Promise<PackageConfiguration>,
  ]);

  const microExecutorsById = new Map(
    microExecutorConfiguration.microExecutors.map((item) => [item.id, item]),
  );
  const packagesById = new Map(packageConfiguration.packages.map((item) => [item.id, item]));

  for (const pkg of packageConfiguration.packages) {
    validatePackageEntities(pkg.id, pkg.entities);
    if (typeof pkg.installed !== "boolean") {
      throw new Error(`Stato di installazione non valido per il package ${pkg.id}.`);
    }
    for (const id of pkg.microExecutorIds) {
      const microExecutor = microExecutorsById.get(id);
      if (!microExecutor) {
        throw new Error(`Micro executor ${id} non trovato per il package ${pkg.id}.`);
      }
      if (
        !microExecutor.packageConfigurationSchemas ||
        !Object.hasOwn(microExecutor.packageConfigurationSchemas, pkg.id)
      ) {
        throw new Error(`Schema di configurazione mancante per il package ${pkg.id} nel micro executor ${id}.`);
      }
    }
  }
  for (const microExecutor of microExecutorConfiguration.microExecutors) {
    if (
      !microExecutor.packageConfigurationSchemas ||
      typeof microExecutor.packageConfigurationSchemas !== "object" ||
      Array.isArray(microExecutor.packageConfigurationSchemas)
    ) {
      throw new Error(`Schemi di configurazione non validi per il micro executor ${microExecutor.id}.`);
    }
    for (const [packageId, schema] of Object.entries(microExecutor.packageConfigurationSchemas)) {
      const pkg = packagesById.get(packageId);
      if (!pkg || !pkg.microExecutorIds.includes(microExecutor.id)) {
        throw new Error(`Package ${packageId} non valido negli schemi del micro executor ${microExecutor.id}.`);
      }
      if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
        throw new Error(`Schema non valido per il package ${packageId} nel micro executor ${microExecutor.id}.`);
      }
    }
    for (const api of microExecutor.apis) {
      if (api.microExecutorId !== microExecutor.id) {
        throw new Error(`Micro executor non valido per il servizio ${api.id}.`);
      }
      for (const id of api.packageIds) {
        const pkg = packagesById.get(id);
        if (!pkg || !pkg.microExecutorIds.includes(microExecutor.id)) {
          throw new Error(`Package ${id} non valido per il servizio ${api.id}.`);
        }
      }
    }
  }
  for (const environment of domainConfiguration.environments) {
    if (
      !Array.isArray(environment.authorizations) ||
      environment.authorizations.some(
        (authorization) =>
          !authorization ||
          typeof authorization.key !== "string" ||
          !authorization.key.trim() ||
          typeof authorization.allowed !== "boolean",
      )
    ) {
      throw new Error(`Autorizzazioni non valide per il dominio ${environment.id}.`);
    }
    const { packageConfigurations } = environment;
    if (!packageConfigurations || typeof packageConfigurations !== "object" || Array.isArray(packageConfigurations)) {
      throw new Error(`Configurazioni package non valide per il dominio ${environment.id}.`);
    }
    for (const [packageId, values] of Object.entries(packageConfigurations)) {
      const pkg = packagesById.get(packageId);
      if (!pkg) {
        throw new Error(`Il package ${packageId} configurato nel dominio ${environment.id} non esiste.`);
      }
      if (!pkg.installed) {
        throw new Error(`Il package ${packageId} configurato nel dominio ${environment.id} non è installato.`);
      }
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new Error(`Configurazione non valida per il package ${packageId} nel dominio ${environment.id}.`);
      }
    }
  }

  return {
    environments: domainConfiguration.environments,
    microExecutors: microExecutorConfiguration.microExecutors,
    packages: packageConfiguration.packages,
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
            aria-label="Grain, pagina iniziale"
          >
            <span className="brand-mark" aria-hidden="true">
              G
            </span>
            <span className="brand-name">Grain</span>
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

function AdministrationLayout() {
  const configuration = useOutletContext<ApplicationConfiguration>();

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <span>{GRAIN_TITLE}</span>
      </div>

      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu amministrazione">
          <section className="environment-summary-card" aria-labelledby="administration-title">
            <p className="eyebrow">Amministrazione</p>
            <h1 id="administration-title">{GRAIN_TITLE}</h1>
            <Link className="analysis-button" to={`/analisi`}>
              Analisi
            </Link>
          </section>
          <div className="environment-sidebar-menu">
            <p className="sidebar-caption">Menu</p>
            <nav className="sidebar-nav">
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="/" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Dashboard
              </NavLink>
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="domini" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Domini applicativi
              </NavLink>
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="packages">
                <span className="sidebar-link-marker" aria-hidden="true" />
                Packages
              </NavLink>
            </nav>
          </div>
        </aside>

        <div className="environment-outlet">
          <Outlet context={configuration} />
        </div>
      </div>
    </main>
  );
}

function AdministrationDashboard() {
  const { environments, packages, microExecutors } = useOutletContext<ApplicationConfiguration>();
  const installedPackages = packages.filter((pkg) => pkg.installed);
  const apiCount = microExecutors.reduce((total, item) => total + item.apis.length, 0);
  const dataSourceCount = microExecutors.reduce((total, item) => total + item.dataSources.length, 0);
  const entityCount = packages.reduce((total, pkg) => total + pkg.entities.length, 0);

  return (
    <section aria-labelledby="dashboard-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{GRAIN_TITLE}</p>
          <h2 id="dashboard-heading">Dashboard</h2>
        </div>
        <span className="detail-format">Dati mock</span>
      </div>
      <p className="page-intro api-intro">
        Panoramica dell'istanza {GRAIN_TITLE}: domini applicativi, package installati e
        micro executor che ne erogano i servizi.
      </p>

      <dl className="capacity-list dashboard-stats">
        <div className="capacity-card">
          <dt>Domini applicativi</dt>
          <dd><strong>{environments.length}</strong> <Link to="/domini">Vedi domini</Link></dd>
        </div>
        <div className="capacity-card">
          <dt>Package installati</dt>
          <dd><strong>{installedPackages.length} / {packages.length}</strong> <Link to="/packages">Vedi packages</Link></dd>
        </div>
        <div className="capacity-card">
          <dt>Micro executor</dt>
          <dd><strong>{microExecutors.length}</strong> {apiCount} servizi API · {dataSourceCount} data source</dd>
        </div>
        <div className="capacity-card">
          <dt>Entità definite dai package</dt>
          <dd><strong>{entityCount}</strong> su {packages.length} package</dd>
        </div>
      </dl>
    </section>
  );
}

function AdministrationDomains() {
  const { environments } = useOutletContext<ApplicationConfiguration>();

  return (
    <section aria-labelledby="domains-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{GRAIN_TITLE}</p>
          <h2 id="domains-heading">Domini applicativi</h2>
        </div>
        <span className="detail-format">{environments.length} domini</span>
      </div>
      <p className="page-intro api-intro">
        Domini applicativi di {GRAIN_TITLE}. Ogni dominio vede tutti i package installati
        e li configura in base alle proprie esigenze.
      </p>
      {environments.length === 0 ? (
        <p className="page-intro">Nessun dominio applicativo configurato.</p>
      ) : (
        <div className="micro-executor-list">
          {environments.map((environment) => (
            <Link
              className="micro-executor-card"
              key={environment.id}
              to={`/applicative-domain/${environment.id}`}
            >
              <div className="micro-executor-card-top">
                <span className="environment-id">{environment.id}</span>
              </div>
              <h3>{environment.title}</h3>
              <p>{environment.description}</p>
              <div className="micro-executor-card-action">
                <span>Dominio applicativo</span>
                <span>Apri <span aria-hidden="true">-&gt;</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function AnalysisLayout() {
  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">{GRAIN_TITLE}</Link>
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
            <NavLink
              className={({ isActive }) =>
                `sidebar-link${isActive ? " is-active" : ""}`
              }
              to="micro-executor-datasource"
              end
            >
              <span className="sidebar-link-marker" aria-hidden="true" />
              Analisi rapporto micro executor e datasource
            </NavLink>
          </nav>
        </aside>
        <div className="environment-outlet">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

function AnalysisMicroExecutorDataSource() {
  return (
    <section aria-labelledby="data-access-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Analisi · Accesso ai dati</p>
          <h1 id="data-access-heading">
            Analisi rapporto micro executor e datasource
          </h1>
        </div>
      </div>
      <p className="page-intro analysis-intro">
        Un micro executor condiviso tra domini può gestire i dati in modi
        diversi. Il Domain-ID identifica il dominio nel contesto della richiesta:
        la strategia determina come viene usato per accedere al data source.
      </p>
      <section className="analysis-comparison" aria-labelledby="data-access-comparison-heading">
        <h2 id="data-access-comparison-heading">Confronto delle strategie</h2>
        <div
          className="analysis-table-wrap"
          role="region"
          aria-label="Tabella di confronto delle strategie di accesso ai dati"
          tabIndex={0}
        >
          <table className="data-access-table">
            <thead>
              <tr>
                <th scope="col">Strategia dello sviluppatore</th>
                <th scope="col">Come usa il Domain-ID</th>
                <th scope="col">Come gestisce il data source</th>
                <th scope="col">Quando sceglierla</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">1. Discriminatore (Row-Level)</th>
                <td>
                  Come filtro, ad esempio <code>WHERE domain_id = :id</code>,
                  oppure attraverso la Row-Level Security (RLS) di PostgreSQL.
                </td>
                <td>Una connessione al database e tabelle condivise tra domini.</td>
                <td>
                  UPP con dati poco complessi ed entità snelle; utile anche per
                  query aggregate tra domini, quando autorizzate.
                </td>
              </tr>
              <tr>
                <th scope="row">2. Separazione per schema</th>
                <td>
                  Per selezionare lo schema, ad esempio <code>dom_a.ordini</code>,
                  o impostare il percorso di sessione con{" "}
                  <code>SET search_path TO dom_a</code>.
                </td>
                <td>
                  Una connessione al database; tabelle separate logicamente
                  per schema.
                </td>
                <td>
                  Un equilibrio tra separazione dei dati e costo computazionale;
                  soluzione consigliata per la maggior parte dei casi da valutare
                  rispetto ai requisiti.
                </td>
              </tr>
              <tr>
                <th scope="row">3. Database dedicato (Multi-Pool)</th>
                <td>
                  Come chiave per selezionare da una mappa il pool di
                  connessioni del dominio.
                </td>
                <td>
                  Più pool di connessioni verso database logici o fisici
                  distinti.
                </td>
                <td>
                  Domini con carichi di traffico molto asimmetrici o vincoli
                  legali e di conformità stringenti.
                </td>
              </tr>
              <tr>
                <th scope="row">4. Agnostico / Condiviso</th>
                <td>Non viene usato per selezionare i dati; può comparire nei log di audit.</td>
                <td>Una connessione al database con dati comuni a tutti i domini.</td>
                <td>
                  Microservizi di lookup, tabelle di configurazione globali e
                  cataloghi comuni.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <div className="analysis-note">
        <p>
          In ogni strategia il data source rimane sotto la responsabilità del
          micro executor: la condivisione tra domini non autorizza altri
          microservizi ad accedervi direttamente.
        </p>
        <p>
          Il Domain-ID deve essere ricavato da un contesto attendibile e
          autorizzato. Filtri, policy RLS e permessi vanno applicati
          coerentemente; con gli schemi, la selezione va controllata e lo
          stato della connessione gestito in sicurezza anche quando si usano
          pool. I dati agnostici devono essere realmente condivisibili.
          Questa pagina descrive strategie progettuali: la POC non le implementa.
        </p>
      </div>
    </section>
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
        <section className="analysis-fact" aria-labelledby="concept-pkg">
          <h2 id="concept-pkg">UPP · Insieme di funzionalità</h2>
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
        src={`${import.meta.env.BASE_URL}/img/er-pkg.png`}
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
    packages: configuration.packages.filter((pkg) => pkg.installed),
    microExecutors: configuration.microExecutors,
  };

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">{GRAIN_TITLE}</Link>
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
                to="health-check"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Health check
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="capacita-limiti"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Capacità e limiti
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="configurazione"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Configurazione
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="entita"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Entità
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="autorizzazioni"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Autorizzazioni
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
  const context: MicroExecutorContext = {
    microExecutor,
    packages: configuration.packages.filter((pkg) => pkg.microExecutorIds.includes(microExecutor.id)),
  };

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">{GRAIN_TITLE}</Link>
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
                to="configurazione"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Configurazione
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
                to="api"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Servizi
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
          <Outlet context={context} />
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

async function loadHealthChecks({ request }: LoaderFunctionArgs) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/package-health.json`, {
    signal: request.signal,
  });
  if (!response.ok) {
    throw new Error(`Caricamento health check non riuscito (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  return parseHealthChecks(data);
}

function DomainMockDataError({ title }: { title: string }) {
  const error = useRouteError();
  const revalidator = useRevalidator();
  return (
    <section aria-labelledby="domain-data-error-heading" role="alert">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{title} · dati mock</p>
          <h2 id="domain-data-error-heading">Dati non disponibili</h2>
        </div>
      </div>
      <p className="page-intro">
        {error instanceof Error ? error.message : `Impossibile caricare i dati: ${title}.`}
      </p>
      <button
        className="json-trigger data-retry"
        type="button"
        onClick={() => revalidator.revalidate()}
        disabled={revalidator.state !== "idle"}
      >
        Riprova
      </button>
    </section>
  );
}

async function loadDomainCapacities({ request }: LoaderFunctionArgs) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/domain-capacity.json`, {
    signal: request.signal,
  });
  if (!response.ok) {
    throw new Error(`Caricamento capacità e limiti non riuscito (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  return parseDomainCapacities(data);
}

function EnvironmentCapacity() {
  const { environment } = useOutletContext<EnvironmentContext>();
  const capacities = useLoaderData<typeof loadDomainCapacities>();
  const capacity = capacities.find((item) => item.domainId === environment.id);
  const numberFormat = new Intl.NumberFormat("it-IT");
  const moneyFormat = new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  return (
    <section aria-labelledby="capacity-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo · {environment.title}</p>
          <h2 id="capacity-heading">Capacità e limiti</h2>
        </div>
        <span className="detail-format">Dati mock</span>
      </div>
      <p className="page-intro api-intro">
        Valori simulati per il dominio, consultabili in sola lettura. Non sono
        limiti applicati né costi reali.
      </p>
      {capacity ? (
        <dl className="capacity-list">
          <div className="capacity-card">
            <dt>Rate limit</dt>
            <dd><strong>{numberFormat.format(capacity.requestsPerMinute)}</strong> richieste / minuto</dd>
          </div>
          <div className="capacity-card">
            <dt>Dimensione massima della richiesta</dt>
            <dd><strong>{numberFormat.format(capacity.maxRequestBytes)}</strong> byte</dd>
          </div>
          <div className="capacity-card">
            <dt>Costo per chiamata</dt>
            <dd><strong>{moneyFormat.format(capacity.costPerCallMicroEur / 1_000_000)}</strong> / chiamata</dd>
          </div>
        </dl>
      ) : (
        <p className="page-intro" role="status">
          Nessun dato mock di capacità e limiti disponibile per questo dominio.
        </p>
      )}
    </section>
  );
}

function EnvironmentHealthCheck() {
  const { environment, packages } = useOutletContext<EnvironmentContext>();
  const checks = useLoaderData<typeof loadHealthChecks>();
  const rows = getDomainHealth(environment.id, packages, checks);
  const healthyCount = rows.filter(({ health }) => health.status === "healthy").length;
  const errorCount = rows.filter(({ health }) => health.status === "error").length;
  const unknownCount = rows.filter(({ health }) => health.status === "unknown").length;

  return (
    <section aria-labelledby="health-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo · {environment.title}</p>
          <h2 id="health-heading">Health check</h2>
        </div>
        <span className="detail-format">Dati mock</span>
      </div>
      <p className="page-intro api-intro">
        Stati e cause di errore simulati per i package installati nel dominio.
        Non viene effettuato alcun controllo reale.
      </p>
      <div className="health-summary" aria-label="Riepilogo health check">
        <div><strong>{healthyCount}</strong><span>Vive</span></div>
        <div><strong>{errorCount}</strong><span>In errore</span></div>
        <div><strong>{unknownCount}</strong><span>Non disponibili</span></div>
      </div>
      {rows.length === 0 ? (
        <p className="page-intro">Nessun package associato al dominio.</p>
      ) : (
        <ul className="health-list" aria-label="Stato dei package">
          {rows.map(({ pkg, health }) => (
            <li className="health-card" key={pkg.id}>
              <div className="health-card-heading">
                <div>
                  <span className="environment-id">{pkg.id}</span>
                  <h3><Link to={`/packages/${pkg.id}`}>{pkg.title}</Link></h3>
                </div>
                <span className={`health-status is-${health.status}`}>
                  {health.status === "healthy" ? "Viva" : health.status === "error" ? "In errore" : "Non disponibile"}
                </span>
              </div>
              {health.status === "error" && (
                <p className="health-reason"><strong>Causa:</strong> {health.reason}</p>
              )}
              {health.status === "unknown" && (
                <p className="health-reason">Nessun dato mock disponibile per questo package nel dominio.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EnvironmentAuthorizations() {
  const { environment } = useOutletContext<EnvironmentContext>();
  const { authorizations } = environment;

  return (
    <section aria-labelledby="authorizations-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo · {environment.title}</p>
          <h2 id="authorizations-heading">Autorizzazioni</h2>
        </div>
        <span className="detail-format">
          {authorizations.length} {authorizations.length === 1 ? "autorizzazione" : "autorizzazioni"}
        </span>
      </div>
      <p className="page-intro api-intro">
        Regole di autorizzazione definite nella configurazione del dominio.
        Ogni chiave può essere consentita o negata.
      </p>
      {authorizations.length === 0 ? (
        <p className="page-intro">Nessuna autorizzazione configurata.</p>
      ) : (
        <ul className="authorization-list" aria-label="Autorizzazioni configurate">
          {authorizations.map((authorization, index) => (
            <li key={`${index}-${authorization.key}`}>
              <code>{authorization.key}</code>
              <span className={`authorization-status${authorization.allowed ? " is-allowed" : " is-denied"}`}>
                {authorization.allowed ? "Consentita" : "Negata"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <section className="analysis-comparison" aria-labelledby="authorization-formats-heading">
        <h3 id="authorization-formats-heading">Livelli e formati</h3>
        <div className="analysis-table-wrap" role="region" aria-label="Formati delle autorizzazioni" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Livello</th>
                <th scope="col">Formato</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Intero dominio</th>
                <td><code>*</code></td>
              </tr>
              <tr>
                <th scope="row">Package</th>
                <td><code>{"<id_package>"}</code></td>
              </tr>
              <tr>
                <th scope="row">Servizio</th>
                <td><code>{"<id_package>.<id_servizio>"}</code></td>
              </tr>
              <tr>
                <th scope="row">Funzione o metodo</th>
                <td><code>{"<id_package>.<id_servizio>-<funzione-metodo>"}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <p className="analysis-note">
        I valori sono esempi consultabili in sola lettura: le regole consentite
        e negate possono rappresentare rispettivamente whitelist e blacklist.
        La POC non verifica né applica queste autorizzazioni e non definisce
        precedenza o comportamento predefinito; i nomi delle funzioni sono
        illustrativi.
      </p>
    </section>
  );
}

const jsonSchemaDialect = "https://json-schema.org/draft/2020-12/schema";

function getExecutorPackageSchema(microExecutor: MicroExecutor, packageId: string): JsonSchema {
  const schema = microExecutor.packageConfigurationSchemas[packageId];
  if (!schema) {
    throw new Error(`Schema mancante per il package ${packageId} nel micro executor ${microExecutor.id}.`);
  }
  return schema;
}

function getPackageSchema(pkg: Package, microExecutors: MicroExecutor[]): JsonSchema | null {
  if (pkg.microExecutorIds.length === 0) {
    return null;
  }
  const fragments = pkg.microExecutorIds.map((id) => {
    const microExecutor = microExecutors.find((item) => item.id === id);
    if (!microExecutor) {
      throw new Error(`Micro executor ${id} non trovato per il package ${pkg.id}.`);
    }
    return getExecutorPackageSchema(microExecutor, pkg.id);
  });
  return {
    $schema: jsonSchemaDialect,
    title: pkg.title,
    allOf: fragments,
  };
}

function ConfigurationSchemas({
  entries,
  showValues = false,
}: {
  entries: { pkg: Package; schema: JsonSchema | null; configuration?: PackageConfigurationValues }[];
  showValues?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="page-intro">Nessun package associato.</p>;
  }
  return (
    <div className="configuration-schema-list">
      {entries.map(({ pkg, schema, configuration }) => (
        <section className="configuration-schema" key={pkg.id} aria-labelledby={`schema-${pkg.id}`}>
          <div className="configuration-schema-heading">
            <div>
              <span className="environment-id">{pkg.id}</span>
              <h3 id={`schema-${pkg.id}`}>{pkg.title}</h3>
            </div>
            <div className="configuration-schema-tags">
              {showValues && (
                <span className={`config-status${configuration ? " is-active" : ""}`}>
                  {configuration ? "Configurata" : "Non configurata"}
                </span>
              )}
            </div>
          </div>
          {schema ? (
            <SchemaProperties
              schema={schema}
              title={pkg.title}
              values={showValues ? { configuration } : undefined}
            />
          ) : (
            <p className="page-intro">Nessuno schema di configurazione disponibile.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function formatConfigurationValue(value: JsonValue | undefined) {
  if (value === undefined) {
    return <span className="configuration-value-missing">Non impostato</span>;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return null;
  }
  return <code>{typeof value === "string" ? value : JSON.stringify(value)}</code>;
}

function SchemaProperties({
  schema,
  title,
  values,
}: {
  schema: JsonSchema;
  title: string;
  values?: { configuration: PackageConfigurationValues | undefined };
}) {
  const { properties, unrepresented } = getSchemaProperties(schema);

  return (
    <>
      {properties.length === 0 ? (
        <p className="page-intro">Nessuna proprietà esplicita nello schema.</p>
      ) : (
        <div className="configuration-properties-wrap" role="region" aria-label={`Proprietà ${title}`} tabIndex={0}>
          <table className="configuration-properties">
            <thead>
              <tr>
                <th scope="col">Proprietà</th>
                <th scope="col">Tipo</th>
                <th scope="col">Descrizione</th>
                {values && <th scope="col">Valore del dominio</th>}
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.path}>
                  <th scope="row" aria-label={property.path} style={{ paddingInlineStart: `${12 + property.depth * 20}px` }}>
                    <code>{property.name}</code>
                  </th>
                  <td><code>{property.type}</code></td>
                  <td>{property.description}</td>
                  {values && (
                    <td className="configuration-value">{formatConfigurationValue(getConfigurationValue(values.configuration, property.segments))}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {unrepresented.length > 0 && (
        <p className="configuration-schema-note">
          Alcuni elementi dello schema non sono rappresentati nell'albero: {unrepresented.join(", ")}.
        </p>
      )}
    </>
  );
}

function EnvironmentConfigurationPage() {
  const { environment, packages, microExecutors } = useOutletContext<EnvironmentContext>();

  return (
    <section aria-labelledby="environment-configuration-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo · {environment.title}</p>
          <h2 id="environment-configuration-heading">Configurazione</h2>
        </div>
        <span className="detail-format">{packages.length} package</span>
      </div>
      <p className="page-intro api-intro">
        Il dominio vede tutti i package installati
        e li configura in base alle proprie esigenze. Per ogni proprietà dello
        schema è indicato il valore impostato dal dominio. I valori sono esempi
        mock in sola lettura.
      </p>
      <ConfigurationSchemas
        showValues
        entries={packages.map((pkg) => ({
          pkg,
          schema: getPackageSchema(pkg, microExecutors),
          configuration: environment.packageConfigurations[pkg.id],
        }))}
      />
    </section>
  );
}

function PackageConfigurationPage() {
  const { pkg, microExecutors } = useOutletContext<PackageContext>();

  return (
    <section aria-labelledby="package-configuration-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Package · {pkg.title}</p>
          <h2 id="package-configuration-heading">Configurazione</h2>
        </div>
      </div>
      <p className="page-intro api-intro">Schema di configurazione mock in sola lettura.</p>
      <ConfigurationSchemas entries={[{ pkg, schema: getPackageSchema(pkg, microExecutors) }]} />
    </section>
  );
}

function MicroExecutorConfigurationPage() {
  const { microExecutor, packages } = useOutletContext<MicroExecutorContext>();

  return (
    <section aria-labelledby="executor-configuration-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Micro executor · {microExecutor.title}</p>
          <h2 id="executor-configuration-heading">Configurazione</h2>
        </div>
        <span className="detail-format">{packages.length} package</span>
      </div>
      <p className="page-intro api-intro">
        Schemi mock in sola lettura definiti da questo micro executor per ogni package.
      </p>
      <ConfigurationSchemas entries={packages.map((pkg) => ({
        pkg,
        schema: { $schema: jsonSchemaDialect, ...getExecutorPackageSchema(microExecutor, pkg.id) },
      }))} />
    </section>
  );
}

function EntitiesTable({ packages, linkToPackage = false }: { packages: Package[]; linkToPackage?: boolean }) {
  const rows = collectPackageEntities(packages);

  if (rows.length === 0) {
    return <p className="page-intro">Nessuna entità definita.</p>;
  }

  return (
    <div className="entities-table-wrap" role="region" aria-label="Elenco delle entità" tabIndex={0}>
      <table className="entities-table">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Descrizione</th>
            <th scope="col">Package di riferimento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ entity, pkg }) => (
            <tr key={JSON.stringify([pkg.id, entity.id])}>
              <th scope="row"><code>{entity.id}</code></th>
              <td>{entity.description}</td>
              <td>
                {linkToPackage ? (
                  <Link to={`/packages/${pkg.id}/entita`}>{pkg.title}</Link>
                ) : pkg.title}
                <span className="entities-package-id">{pkg.id}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnvironmentEntities() {
  const { environment, packages } = useOutletContext<EnvironmentContext>();
  const count = collectPackageEntities(packages).length;

  return (
    <section aria-labelledby="environment-entities-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Dominio applicativo · {environment.title}</p>
          <h2 id="environment-entities-heading">Entità</h2>
        </div>
        <span className="detail-format">{count} entità</span>
      </div>
      <p className="page-intro api-intro">
        Entità dei package installati, visibili dal dominio.
        I dati sono esempi mock in sola lettura.
      </p>
      <EntitiesTable packages={packages} linkToPackage />
    </section>
  );
}

function PackageEntities() {
  const { pkg } = useOutletContext<PackageContext>();

  return (
    <section aria-labelledby="package-entities-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Package · {pkg.title}</p>
          <h2 id="package-entities-heading">Entità</h2>
        </div>
        <span className="detail-format">{pkg.entities.length} entità</span>
      </div>
      <p className="page-intro api-intro">
        Entità di cui è responsabile questo package. I dati sono esempi mock in sola lettura.
      </p>
      <EntitiesTable packages={[pkg]} />
    </section>
  );
}

function AdministrationPackages() {
  const { packages } = useOutletContext<ApplicationConfiguration>();
  const installedPackages = packages.filter((pkg) => pkg.installed);

  return (
    <section aria-labelledby="package-list-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{GRAIN_TITLE}</p>
          <h2 id="package-list-heading">Packages</h2>
        </div>
        <div className="detail-heading-actions">
          <span className="detail-format">{installedPackages.length} installati</span>
          <Link className="analysis-button" to="store">Package Store</Link>
        </div>
      </div>
      <p className="page-intro api-intro">
        Package installati su {GRAIN_TITLE}. Ogni package raggruppa uno o più
        micro executor ed è disponibile in tutti i domini applicativi, che lo
        configurano in base alle proprie esigenze.
      </p>
      {installedPackages.length === 0 ? (
        <p className="page-intro">Nessun package installato.</p>
      ) : (
        <div className="micro-executor-list">
          {installedPackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </section>
  );
}

function PackageStore() {
  const { packages } = useOutletContext<ApplicationConfiguration>();

  return (
    <section aria-labelledby="package-store-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{GRAIN_TITLE}</p>
          <h2 id="package-store-heading">Package Store</h2>
        </div>
        <Link className="message-link" to=".." relative="path">
          Torna ai packages
        </Link>
      </div>
      <p className="page-intro api-intro">
        Catalogo dei package installabili su {GRAIN_TITLE}. Lo stato indica
        quelli già installati; la vista è in sola lettura.
      </p>
      {packages.length === 0 ? (
        <p className="page-intro">Nessun package presente nel catalogo.</p>
      ) : (
        <div className="micro-executor-list">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} showStatus />
          ))}
        </div>
      )}
    </section>
  );
}

function InstallationStatus({ installed }: { installed: boolean }) {
  return (
    <span className={`config-status${installed ? " is-active" : ""}`}>
      {installed ? "Installato" : "Non installato"}
    </span>
  );
}

function PackageCard({ pkg, showStatus = false }: { pkg: Package; showStatus?: boolean }) {
  return (
    <Link className="micro-executor-card" to={`/packages/${pkg.id}`}>
      <div className="micro-executor-card-top">
        <span className="environment-id">{pkg.id}</span>
        {showStatus ? (
          <InstallationStatus installed={pkg.installed} />
        ) : (
          <span className="micro-executor-api-count">
            {pkg.microExecutorIds.length} micro executor
          </span>
        )}
      </div>
      <h3>{pkg.title}</h3>
      <p>{pkg.description}</p>
      <div className="micro-executor-card-action">
        <span>Package</span>
        <span>Apri <span aria-hidden="true">-&gt;</span></span>
      </div>
    </Link>
  );
}

function PackageLayout() {
  const configuration = useOutletContext<ApplicationConfiguration>();
  const { packageId } = useParams();
  const pkg = configuration.packages.find((item) => item.id === packageId);
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  if (!pkg) {
    return <NotFoundPage />;
  }

  const microExecutors = pkg.microExecutorIds.map((id) => {
    const microExecutor = configuration.microExecutors.find((item) => item.id === id);
    if (!microExecutor) {
      throw new Error(`Micro executor ${id} non trovato per il package ${pkg.id}.`);
    }
    return microExecutor;
  });
  const context: PackageContext = { pkg, microExecutors };

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">{GRAIN_TITLE}</Link>
        <span aria-hidden="true">/</span>
        <span>{pkg.id}</span>
      </div>
      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu package">
          <section className="environment-summary-card" aria-labelledby="package-title">
            <p className="eyebrow">Package</p>
            <h1 id="package-title">{pkg.title}</h1>
            <button className="json-trigger" type="button" onClick={() => setIsJsonOpen(true)}>
              Mostra JSON
            </button>
          </section>
          <div>
            <p className="sidebar-caption">Menu package</p>
            <nav className="sidebar-nav" aria-label="Viste package">
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="dettaglio" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Dettaglio
              </NavLink>
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="configurazione" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Configurazione
              </NavLink>
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="entita" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Entità
              </NavLink>
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="micro-executors" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Micro executors
              </NavLink>
              <NavLink className={({ isActive }) => `sidebar-link${isActive ? " is-active" : ""}`} to="servizi" end>
                <span className="sidebar-link-marker" aria-hidden="true" />
                Servizi
              </NavLink>
            </nav>
          </div>
        </aside>
        <div className="environment-outlet">
          <Outlet context={context} />
        </div>
      </div>
      {isJsonOpen && (
        <JsonDialog title={pkg.title} id={pkg.id} value={pkg} onClose={() => setIsJsonOpen(false)} />
      )}
    </main>
  );
}

function PackageDetail() {
  const { pkg } = useOutletContext<PackageContext>();

  return (
    <section className="detail-view" aria-labelledby="package-detail-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Anagrafica package</p>
          <h2 id="package-detail-heading">Dettaglio</h2>
        </div>
      </div>
      <dl className="detail-list">
        <div className="detail-row">
          <dt>ID</dt>
          <dd className="detail-value detail-id">{pkg.id}</dd>
        </div>
        <div className="detail-row">
          <dt>Titolo</dt>
          <dd className="detail-value">{pkg.title}</dd>
        </div>
        <div className="detail-row">
          <dt>Obiettivo</dt>
          <dd className="detail-value detail-description">{pkg.description}</dd>
        </div>
        <div className="detail-row">
          <dt>Stato</dt>
          <dd className="detail-value"><InstallationStatus installed={pkg.installed} /></dd>
        </div>
      </dl>
    </section>
  );
}

function PackageServices() {
  const { pkg, microExecutors } = useOutletContext<PackageContext>();
  const apis = microExecutors.flatMap((microExecutor) =>
    microExecutor.apis.filter((api) => api.packageIds.includes(pkg.id)),
  );

  return (
    <section aria-labelledby="package-services-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Package · {pkg.title}</p>
          <h2 id="package-services-heading">Servizi</h2>
        </div>
        <span className="detail-format">{apis.length} servizi</span>
      </div>
      <p className="page-intro api-intro">
        Servizi esplicitamente associati a questo package nei micro executor.
      </p>
      {apis.length === 0 ? (
        <p className="page-intro">Nessun servizio associato.</p>
      ) : (
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
                  <Link className="data-source-owner" to={`/micro-executors/${api.microExecutorId}/api`}>
                    {api.microExecutorId}
                  </Link>
                </dd>
              </div>
            </dl>
          ))}
        </div>
      )}
    </section>
  );
}

function PackageMicroExecutors() {
  const { pkg, microExecutors } = useOutletContext<PackageContext>();

  return (
    <section aria-labelledby="package-executors-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Package · {pkg.title}</p>
          <h2 id="package-executors-heading">Micro executors</h2>
        </div>
        <span className="detail-format">{microExecutors.length} micro executor</span>
      </div>
      <p className="page-intro api-intro">
        Micro executor associati a questo package.
      </p>
      {microExecutors.length === 0 ? (
        <p className="page-intro">Nessun micro executor associato.</p>
      ) : (
        <div className="micro-executor-list">
          {microExecutors.map((microExecutor) => (
            <Link
              className="micro-executor-card"
              key={microExecutor.id}
              to={`/micro-executors/${microExecutor.id}`}
            >
              <div className="micro-executor-card-top">
                <span className="environment-id">{microExecutor.id}</span>
                <span className="micro-executor-api-count">{microExecutor.apis.length} servizi</span>
              </div>
              <h3>{microExecutor.title}</h3>
              <p>{microExecutor.description}</p>
              <div className="micro-executor-card-action">
                <span className="micro-executor-url">{microExecutor.url}</span>
                <span>Apri <span aria-hidden="true">-&gt;</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function MicroExecutorDetail() {
  const { microExecutor } = useOutletContext<MicroExecutorContext>();

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
        <span className="detail-format">{microExecutor.apis.length} servizi</span>
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
  const { microExecutor } = useOutletContext<MicroExecutorContext>();

  return (
    <section
      className="micro-executor-apis"
      aria-labelledby="micro-executor-api-heading"
    >
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Servizi associati</p>
          <h2 id="micro-executor-api-heading">Servizi</h2>
        </div>
        <span className="detail-format">
          {String(microExecutor.apis.length).padStart(2, "0")} servizi
        </span>
      </div>
      {microExecutor.apis.length === 0 ? (
        <p className="page-intro">Nessun servizio associato.</p>
      ) : (
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
      )}
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

function MicroExecutorDataSources() {
  const { microExecutor } = useOutletContext<MicroExecutorContext>();

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
      <p className="eyebrow">Configurazione / domini applicativi</p>
      <h1>Caricamento dati</h1>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="site-main message-page">
      <p className="eyebrow">Risorsa non trovata</p>
      <h1>Configurazione non disponibile</h1>
      <p className="page-intro">
        La risorsa richiesta non &egrave; presente nella configurazione.
      </p>
      <Link className="message-link" to="/">
        Torna all'amministrazione
      </Link>
    </main>
  );
}

function DomainRuntimePage() {
  const { id } = useParams();

  return (
    <main className="runtime-page">
      <h1>Runtime dominio applicativo {id}</h1>
    </main>
  );
}

function ConfigurationError() {
  return (
    <main className="site-main message-page">
      <p className="eyebrow">Errore di configurazione</p>
      <h1>Dati non disponibili</h1>
      <p className="page-intro">
        Non &egrave; stato possibile caricare i dati dei domini applicativi.
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
        {
          element: <AdministrationLayout />,
          children: [
            { index: true, element: <AdministrationDashboard /> },
            { path: "domini", element: <AdministrationDomains /> },
            { path: "packages", element: <AdministrationPackages /> },
            { path: "packages/store", element: <PackageStore /> },
          ],
        },
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
            {
              path: "micro-executor-datasource",
              element: <AnalysisMicroExecutorDataSource />,
            },
            ...analysisCases.map((analysisCase) => ({
              path: analysisCase.path,
              element: <AnalysisCasePage analysisCase={analysisCase} />,
            })),
          ],
        },
        {
          path: "packages/:packageId",
          element: <PackageLayout />,
          children: [
            { index: true, element: <Navigate to="dettaglio" replace /> },
            { path: "dettaglio", element: <PackageDetail /> },
            { path: "configurazione", element: <PackageConfigurationPage /> },
            { path: "entita", element: <PackageEntities /> },
            { path: "micro-executors", element: <PackageMicroExecutors /> },
            { path: "servizi", element: <PackageServices /> },
          ],
        },
        {
          path: "micro-executors/:microExecutorId",
          element: <MicroExecutorLayout />,
          children: [
            { index: true, element: <Navigate to="dettaglio" replace /> },
            { path: "dettaglio", element: <MicroExecutorDetail /> },
            { path: "configurazione", element: <MicroExecutorConfigurationPage /> },
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
            { path: "configurazione", element: <EnvironmentConfigurationPage /> },
            { path: "health-check", loader: loadHealthChecks, element: <EnvironmentHealthCheck />, errorElement: <DomainMockDataError title="Health check" /> },
            { path: "capacita-limiti", loader: loadDomainCapacities, element: <EnvironmentCapacity />, errorElement: <DomainMockDataError title="Capacità e limiti" /> },
            { path: "entita", element: <EnvironmentEntities /> },
            { path: "autorizzazioni", element: <EnvironmentAuthorizations /> },
            {
              path: "ui-personalizzazione",
              element: <UiPersonalizationPage />,
            },
          ],
        },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
    { path: "/app/:id/*", element: <DomainRuntimePage /> },
  ],
  { basename: import.meta.env.BASE_URL },
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
