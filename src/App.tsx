import { useEffect, useRef, useState } from 'react'
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
} from 'react-router-dom'
import './App.css'

type UiCustomization = {
  theme: {
    id: string
    name: string
    mode: 'light' | 'dark'
    accent: string
  }
  localization: {
    locale: string
    language: string
    dateFormat: string
    numberFormat: string
  }
  activeLogo: {
    id: string
    name: string
    mark: string
    alt: string
  }
}

type MicroExecutor = {
  id: string
  title: string
  description: string
  url: string
  apis: ApiDefinition[]
}

type ApiDefinition = {
  id: string
  description: string
  microExecutorId: string
}

type ApplicationDomain = {
  id: string
  title: string
  description: string
  microExecutorIds: string[]
  uiCustomization: UiCustomization
}

type DomainConfiguration = {
  schemaVersion: number
  environments: ApplicationDomain[]
}

type MicroExecutorConfiguration = {
  schemaVersion: number
  microExecutors: MicroExecutor[]
}

type ApplicationConfiguration = {
  environments: ApplicationDomain[]
  microExecutors: MicroExecutor[]
}

type EnvironmentContext = {
  environment: ApplicationDomain
  microExecutors: MicroExecutor[]
}

type JsonDialogProps = {
  title: string
  id: string
  value: unknown
  onClose: () => void
}

async function loadConfiguration(): Promise<ApplicationConfiguration> {
  const [domainsResponse, microExecutorsResponse] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/application-domains.json`),
    fetch(`${import.meta.env.BASE_URL}data/micro-executors.json`),
  ])

  if (!domainsResponse.ok || !microExecutorsResponse.ok) {
    throw new Error('Impossibile caricare la configurazione degli ambienti.')
  }

  const [domainConfiguration, microExecutorConfiguration] = await Promise.all([
    domainsResponse.json() as Promise<DomainConfiguration>,
    microExecutorsResponse.json() as Promise<MicroExecutorConfiguration>,
  ])

  return {
    environments: domainConfiguration.environments,
    microExecutors: microExecutorConfiguration.microExecutors,
  }
}

function AppShell() {
  const configuration = useLoaderData() as ApplicationConfiguration

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/" aria-label="Dominio applicativo, pagina iniziale">
            <span className="brand-mark" aria-hidden="true">DA</span>
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
  )
}

function EnvironmentSelection() {
  const { environments } = useOutletContext<ApplicationConfiguration>()

  return (
    <main className="site-main">
      <p className="eyebrow page-eyebrow">Configurazione / ambienti</p>
      <div className="page-heading">
        <div>
          <h1>Scegli un ambiente</h1>
          <p className="page-intro">
            Apri un ambiente applicativo per consultare il dominio e la configurazione associata.
          </p>
        </div>
        <div className="environment-total">
          <span>{String(environments.length).padStart(2, '0')}</span>
          <span>ambienti disponibili</span>
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
              <span className="environment-index">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="environment-card-copy">
              <h2>{environment.title}</h2>
              <p>{environment.description}</p>
            </div>
            <div className="environment-card-action">Apri ambiente <span aria-hidden="true">-&gt;</span></div>
          </Link>
        ))}
      </div>
    </main>
  )
}

function EnvironmentLayout() {
  const configuration = useOutletContext<ApplicationConfiguration>()
  const { environmentId } = useParams()
  const environment = configuration.environments.find((item) => item.id === environmentId)
  const [isJsonOpen, setIsJsonOpen] = useState(false)

  if (!environment) {
    return <NotFoundPage />
  }

  const environmentContext: EnvironmentContext = {
    environment,
    microExecutors: configuration.microExecutors.filter((microExecutor) =>
      environment.microExecutorIds.includes(microExecutor.id),
    ),
  }

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">Tutti gli ambienti</Link>
        <span aria-hidden="true">/</span>
        <span>{environment.id}</span>
      </div>

      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu ambiente">
          <section className="environment-summary-card" aria-labelledby="environment-title">
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
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                to="dettaglio"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Dettaglio
              </NavLink>
              <NavLink
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                to="api"
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                API
              </NavLink>
              <NavLink
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
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
  )
}

function MicroExecutorLayout() {
  const configuration = useOutletContext<ApplicationConfiguration>()
  const { microExecutorId } = useParams()
  const microExecutor = configuration.microExecutors.find((item) => item.id === microExecutorId)
  const [isJsonOpen, setIsJsonOpen] = useState(false)

  if (!microExecutor) {
    return <NotFoundPage />
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
          <section className="environment-summary-card" aria-labelledby="micro-executor-title">
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
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                to="dettaglio"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                Dettaglio
              </NavLink>
              <NavLink
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                to="api"
                end
              >
                <span className="sidebar-link-marker" aria-hidden="true" />
                API
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
  )
}

function JsonDialog({ title, id, value, onClose }: JsonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      aria-labelledby="json-dialog-title"
      className="json-dialog"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
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
      <pre className="json-code"><code>{JSON.stringify(value, null, 2)}</code></pre>
    </dialog>
  )
}

function EnvironmentDetail() {
  const { environment } = useOutletContext<EnvironmentContext>()

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
          <dd className="detail-value detail-description">{environment.description}</dd>
        </div>
      </dl>
    </section>
  )
}

function MicroExecutorsPage() {
  const { environment, microExecutors } = useOutletContext<EnvironmentContext>()

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
              <span>Apri <span aria-hidden="true">-&gt;</span></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function MicroExecutorDetail() {
  const microExecutor = useOutletContext<MicroExecutor>()

  return (
    <section className="detail-view" aria-labelledby="micro-executor-detail-heading">
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
          <dd className="detail-value detail-description">{microExecutor.description}</dd>
        </div>
        <div className="detail-row">
          <dt>URL</dt>
          <dd className="detail-value micro-executor-url">{microExecutor.url}</dd>
        </div>
      </dl>
    </section>
  )
}

function MicroExecutorApis() {
  const microExecutor = useOutletContext<MicroExecutor>()

  return (
    <section className="micro-executor-apis" aria-labelledby="micro-executor-api-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Servizi associati</p>
          <h2 id="micro-executor-api-heading">API</h2>
        </div>
        <span className="detail-format">
          {String(microExecutor.apis.length).padStart(2, '0')} servizi
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
              <dd className="detail-value api-executor-id">{api.microExecutorId}</dd>
            </div>
          </dl>
        ))}
      </div>
    </section>
  )
}

function ApiPage() {
  const environmentContext = useOutletContext<EnvironmentContext>()
  const { microExecutors } = environmentContext
  const apiCount = microExecutors.reduce((count, microExecutor) => count + microExecutor.apis.length, 0)

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
          className={({ isActive }) => `api-tab${isActive ? ' is-active' : ''}`}
          to="servizi"
          end
        >
          Servizi
          <span className="api-tab-count">{apiCount}</span>
        </NavLink>
        <NavLink
          className={({ isActive }) => `api-tab${isActive ? ' is-active' : ''}`}
          to="micro-executors"
          end
        >
          Micro executors
          <span className="api-tab-count">{microExecutors.length}</span>
        </NavLink>
      </nav>
      <Outlet context={environmentContext} />
    </section>
  )
}

function ApiServicesPage() {
  const { environment, microExecutors } = useOutletContext<EnvironmentContext>()
  const apis = microExecutors.flatMap((microExecutor) => microExecutor.apis)

  return (
    <section className="api-services-view" aria-label="Servizi API">
      <p className="page-intro api-intro">
        API contenute nei micro executors associati al dominio applicativo {environment.title}.
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
              <dd className="detail-value api-executor-id">{api.microExecutorId}</dd>
            </div>
          </dl>
        ))}
      </div>
    </section>
  )
}

function UiPersonalizationPage() {
  const { environment } = useOutletContext<EnvironmentContext>()
  const { theme, localization, activeLogo } = environment.uiCustomization

  return (
    <section className="ui-personalization-view" aria-labelledby="ui-personalization-heading">
      <div className="detail-heading">
        <div>
          <p className="eyebrow">Configurazione del dominio</p>
          <h2 id="ui-personalization-heading">UI e personalizzazione</h2>
        </div>
      </div>
      <div className="ui-settings">
        <section className="ui-setting-row" aria-labelledby="theme-setting-heading">
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
              <dd>{theme.mode === 'light' ? 'Chiaro' : 'Scuro'}</dd>
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
        <section className="ui-setting-row" aria-labelledby="localization-setting-heading">
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
        <section className="ui-setting-row" aria-labelledby="logo-setting-heading">
          <h3 id="logo-setting-heading">Logo attivo</h3>
          <div className="ui-active-logo">
            <div className="ui-active-logo-mark" role="img" aria-label={activeLogo.alt}>
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
  )
}

function ConfigurationLoading() {
  return (
    <main className="site-main message-page" aria-live="polite">
      <p className="eyebrow">Configurazione / ambienti</p>
      <h1>Caricamento dati</h1>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="site-main message-page">
      <p className="eyebrow">Ambiente non trovato</p>
      <h1>Configurazione non disponibile</h1>
      <p className="page-intro">L'ambiente richiesto non &egrave; presente tra i domini configurati.</p>
      <Link className="message-link" to="/">Torna agli ambienti</Link>
    </main>
  )
}

function ConfigurationError() {
  return (
    <main className="site-main message-page">
      <p className="eyebrow">Errore di configurazione</p>
      <h1>Dati non disponibili</h1>
      <p className="page-intro">Non &egrave; stato possibile caricare i dati degli ambienti.</p>
      <a className="message-link" href={import.meta.env.BASE_URL}>Ricarica la pagina</a>
    </main>
  )
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      loader: loadConfiguration,
      HydrateFallback: ConfigurationLoading,
      element: <AppShell />,
      errorElement: <ConfigurationError />,
      children: [
        { index: true, element: <EnvironmentSelection /> },
        {
          path: 'micro-executors/:microExecutorId',
          element: <MicroExecutorLayout />,
          children: [
            { index: true, element: <Navigate to="dettaglio" replace /> },
            { path: 'dettaglio', element: <MicroExecutorDetail /> },
            { path: 'api', element: <MicroExecutorApis /> },
          ],
        },
        {
          path: 'applicative-domain/:environmentId',
          element: <EnvironmentLayout />,
          children: [
            { index: true, element: <Navigate to="dettaglio" replace /> },
            { path: 'dettaglio', element: <EnvironmentDetail /> },
            {
              path: 'api',
              element: <ApiPage />,
              children: [
                { index: true, element: <Navigate to="servizi" replace /> },
                { path: 'servizi', element: <ApiServicesPage /> },
                { path: 'micro-executors', element: <MicroExecutorsPage /> },
              ],
            },
            { path: 'ui-personalizzazione', element: <UiPersonalizationPage /> },
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)

function App() {
  return <RouterProvider router={router} />
}

export default App
