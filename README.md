# React + TypeScript + Vite

## Navigazione e domini applicativi

L'istanza Grain è sempre Smeup SI: non esiste un'anagrafica delle istanze né
una pagina per sceglierle. L'amministrazione parte dalla radice `/`,
che apre direttamente il layout con menu a sinistra («Domini applicativi» e
«Packages») e sezione dinamica a destra; da qui si raggiunge anche l'«Analisi».
Il menu del dominio non ha una voce Packages: i package si consultano
dall'amministrazione. Ogni altro percorso `/app/:id` mostra la pagina di
fallback «Runtime dominio applicativo :id».

I domini sono in `public/data/application-domains.json`: Smeup BSA
(`ges_10adv`), Smeup LAB (`ges_49adv`) e Smeup ICS (`ges_11adv`).

## Data sources

I data source mock sono definiti in `public/data/micro-executors.json` nell'array
`dataSources` del micro executor responsabile. Ogni elemento contiene `id`,
`title`, `type` e `description` ed è visibile nella pagina del micro executor.

## Packages

L'anagrafica mock `public/data/packages.json` contiene per ogni package `id`,
`title`, `description`, `microExecutorIds`, `installed` ed `entities`:

| Package | ID | Micro executor | Installato |
| --- | --- | --- | --- |
| Smeup ES | `smeup-es` | `me-java-as400proxy`, `me-java-h53` | sì |
| HOLOS | `holos` | `me-node-holos` | sì |
| Smeup Multipiattaforma | `smeup-multipiattaforma` | `me-java-rpgle-std` | no |
| Evodoc | `evodoc` | `me-java-evodoc` | no |
| Archismall | `archismall` | `me-java-archismall` | no |

La voce «Packages» mostra solo i package installati sull'istanza Grain
(`installed: true`); il bottone «Package Store» apre il catalogo completo, con
lo stato di installazione di ogni package. Lo Store è in sola lettura: non
installa né disinstalla. Evodoc e Archismall, con i loro micro executor,
servizi e data source, sono esempi inventati.

Ogni dominio vede tutti i package installati e contiene solo le loro
configurazioni (vedi «Configurazioni package del dominio»). Ogni servizio
elenca i package a cui appartiene tramite `packageIds` in
`public/data/micro-executors.json`: la pagina del package mostra solo questi
servizi. La voce «Micro executors» nella pagina del package elenca quelli
associati e permette di aprirne il dettaglio. I riferimenti a package
inesistenti impediscono il caricamento della configurazione. Gli URL dei
micro executor sono esempi mock.

## Configurazioni package del dominio

Ogni dominio definisce in `public/data/application-domains.json` l'oggetto
`packageConfigurations`, indicizzato per ID package, con i valori di
configurazione che il dominio applica a quel package secondo il suo schema. Le
chiavi devono essere package esistenti e installati; altrimenti la configurazione non viene
caricata. Un package senza chiave risulta «Non configurato». I valori sono esempi mock e non vengono validati rispetto allo
schema durante il caricamento (lo fa il test `tests/package-configurations.test.mjs`).

## Entità dei package

Ogni package definisce in `public/data/packages.json` l'array obbligatorio
`entities`, con `id` e `description` per ogni entità; il package che contiene
l'array è quello di riferimento. Gli ID sono univoci all'interno del package. Le entità presenti
sono esempi mock, non un catalogo di responsabilità verificato.
La voce «Entità» del package mostra il suo elenco; quella del dominio aggrega
le entità di tutti i package, senza confondere eventuali ID uguali
appartenenti a package diversi. Entrambe le viste
sono in sola lettura.

## Schemi di configurazione

Ogni micro executor definisce in `packageConfigurationSchemas` uno schema JSON
per ciascun package che lo utilizza, indicizzato per ID package. Gli schemi sono esempi
mock, non la documentazione di parametri effettivi. La configurazione
verifica che ogni associazione package/micro executor abbia uno schema e che
non esistano riferimenti a package non associati.

La voce «Configurazione» del dominio mostra in sola lettura tutti gli schemi
di tutti i package, affiancati dai valori impostati dal dominio in
`packageConfigurations`. La stessa vista è disponibile nel package; il micro
executor mostra invece i propri schemi per tutti i package che lo utilizzano.
Lo schema del package è un JSON Schema draft 2020-12 che combina i contributi
dei suoi micro executor tramite `allOf`, senza modificarli. Le viste non
modificano valori né applicano configurazioni. Nelle tre viste le proprietà
esplicite sono presentate come albero con tipo e descrizione, combinando i
contributi `allOf`; le proprietà annidate sono indentate. Gli altri vincoli
JSON Schema non sono un editor né una rappresentazione completa dello schema:
composizioni alternative, riferimenti e proprietà dinamiche non vengono
espansi e sono segnalati nella vista.
Per verificare l'estrazione delle proprietà, eseguire
`node --experimental-strip-types --test tests/*.test.mjs`
con Node.js 22.

## Health check

La voce «Health check» del dominio mostra tutti i suoi package, con un riepilogo degli stati e la causa per ogni errore.
I dati in `public/data/package-health.json` sono **simulati**: non viene
interrogato alcun servizio e gli stati non indicano la salute reale dei package.
Ogni record associa `domainId` e `packageId` a uno stato `healthy` oppure `error`;
per `error` è obbligatorio indicare `reason`. Un package senza record per il
dominio compare come «Non disponibile». Dati non validi o non caricabili sono
segnalati nella dashboard, senza impedire l'accesso alle altre pagine.

## Capacità e limiti

La voce «Capacità e limiti» del dominio mostra in sola lettura il rate limit
in richieste al minuto, la dimensione massima della richiesta in byte e il
costo per chiamata in euro. I dati sono esempi mock in
`public/data/domain-capacity.json`: non sono limiti applicati né costi reali.
Ogni record è riferito a un dominio; `costPerCallMicroEur` esprime il costo in
milionesimi di euro. Se il dominio non ha un record, la pagina segnala che i
dati non sono disponibili; dati invalidi o non caricabili sono segnalati senza
impedire l'accesso alle altre pagine.

## Autorizzazioni

Ogni dominio definisce `authorizations` in
`public/data/application-domains.json` come lista di oggetti con `key` (stringa)
e `allowed` (booleano): `true` per consentire e `false` per negare. I formati
illustrati sono `*` (dominio), `<id_package>`, `<id_package>.<id_servizio>` e
`<id_package>.<id_servizio>-<funzione-metodo>`. La pagina del dominio mostra i
valori in sola lettura e verifica che la struttura sia valida, ma non applica
controlli di accesso né definisce precedenze o comportamento predefinito. I
nomi delle funzioni negli esempi sono illustrativi.

## Analisi

La pagina introduttiva presenta le relazioni tra UPP, microservizi e data
source, prima dei casi di analisi. Sono principi architetturali illustrativi:
la POC non verifica l'isolamento o i permessi dei data source.
La voce «Analisi rapporto micro executor e datasource» confronta quattro
strategie di accesso ai dati per dominio; non ne implementa il funzionamento.

Le voci e le rispettive pagine sono definite nell'array `analysisCases` in
`src/App.tsx`. Per aggiungere un caso, specificare percorso, titolo, descrizione,
passaggio del ragionamento e domanda successiva o sintesi finale, spiegazioni su
UPP e dati, esempio, sintesi per il confronto, percorso dell'immagine sotto
`public/` e testo alternativo. L'ordine nell'array definisce il percorso.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
