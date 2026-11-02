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

type FeatureConfiguration = {
  id: string
  title: string
  description: string
  enabled: boolean
}

type ApplicationDomain = {
  id: string
  title: string
  description: string
  features: FeatureConfiguration[]
}

type DomainConfiguration = {
  schemaVersion: number
  environments: ApplicationDomain[]
}

type JsonDialogProps = {
  environment: ApplicationDomain
  onClose: () => void
}

async function loadConfiguration(): Promise<ApplicationDomain[]> {
  const response = await fetch('/data/application-domains.json')

  if (!response.ok) {
    throw new Error('Impossibile caricare la configurazione degli ambienti.')
  }

  const configuration = (await response.json()) as DomainConfiguration
  return configuration.environments
}

function AppShell() {
  const environments = useLoaderData() as ApplicationDomain[]

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
      <Outlet context={environments} />
    </div>
  )
}

function EnvironmentSelection() {
  const environments = useOutletContext<ApplicationDomain[]>()

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
            to={`/ambienti/${environment.id}`}
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
  const environments = useOutletContext<ApplicationDomain[]>()
  const { environmentId } = useParams()
  const environment = environments.find((item) => item.id === environmentId)
  const [isJsonOpen, setIsJsonOpen] = useState(false)

  if (!environment) {
    return <NotFoundPage />
  }

  return (
    <main className="site-main environment-main">
      <div className="environment-breadcrumb">
        <Link to="/">Tutti gli ambienti</Link>
        <span aria-hidden="true">/</span>
        <span>{environment.id}</span>
      </div>

      <div className="environment-heading">
        <div>
          <p className="eyebrow">Ambiente applicativo</p>
          <h1>{environment.title}</h1>
        </div>
        <div className="environment-controls">
          <div className="environment-state">
            <span className="status-dot" aria-hidden="true" />
            Dominio configurato
          </div>
          <button
            className="json-trigger"
            type="button"
            onClick={() => setIsJsonOpen(true)}
          >
            Mostra JSON
          </button>
        </div>
      </div>

      <div className="environment-layout">
        <aside className="environment-sidebar" aria-label="Menu ambiente">
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
          </nav>
        </aside>

        <div className="environment-outlet">
          <Outlet context={environment} />
        </div>
      </div>
      {isJsonOpen && (
        <JsonDialog environment={environment} onClose={() => setIsJsonOpen(false)} />
      )}
    </main>
  )
}

function JsonDialog({ environment, onClose }: JsonDialogProps) {
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
          <h2 id="json-dialog-title">{environment.title}</h2>
          <span className="json-dialog-id">{environment.id}</span>
        </div>
        <button className="json-dialog-close" type="button" onClick={onClose}>
          Chiudi
        </button>
      </div>
      <pre className="json-code"><code>{JSON.stringify(environment, null, 2)}</code></pre>
    </dialog>
  )
}

function EnvironmentDetail() {
  const environment = useOutletContext<ApplicationDomain>()

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
      <a className="message-link" href="/">Ricarica la pagina</a>
    </main>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    loader: loadConfiguration,
    HydrateFallback: ConfigurationLoading,
    element: <AppShell />,
    errorElement: <ConfigurationError />,
    children: [
      { index: true, element: <EnvironmentSelection /> },
      {
        path: 'ambienti/:environmentId',
        element: <EnvironmentLayout />,
        children: [
          { index: true, element: <Navigate to="dettaglio" replace /> },
          { path: 'dettaglio', element: <EnvironmentDetail /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
