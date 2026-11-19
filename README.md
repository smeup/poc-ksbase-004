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
(`ges_10adv`), Smeup LAB (`ges_49adv`), Holos one
(`holos_one`) e Holos two (`holos_two`).

Ogni dominio elenca in `packages` i package installati a cui è associato, con
`enabled` attivo o disattivato: i domini Smeup hanno solo `smeup-es` attivo; i
domini Holos hanno `holos` attivo e `smeup-es` disattivato. Configurazione,
servizi e health check del dominio considerano solo i package attivi; il
dettaglio del dominio li mostra tutti con il loro stato.

## Packages

`public/data/packages.json` contiene il catalogo dei package (`packages`) e
l'elenco dei package installati sull'istanza (`installed`). Ogni package è un
manifest con `name`, `version`, `grainVersion`, `publisher`, `description`,
`publishedAt` e `components`. Un componente è di tipo:

- `dsl`: `name`, `repository`, `ref`;
- `micro-executor`: `name`, `image` e, facoltativo, `configuration` con due
  JSON Schema: `instance` (configurazione dell'istanza del micro executor) e
  `applicativeDomain` (valori impostati da ogni dominio applicativo).

I micro executor non hanno un'anagrafica separata: sono ricavati dai componenti
dei package. I nomi dei componenti sono univoci in tutto il catalogo.

| Package | Nome | Micro executor | DSL | Installato |
| --- | --- | --- | --- | --- |
| Smeup Enterprise Suite | `smeup-es` | `me-java-as400-proxy`, `me-java-h53` | `kokos-dsl-smeupes` | sì |
| Holos | `holos` | `me-node-holos`, `me-node-holos-rules` | `kokos-dsl-holos` | sì |
| Smeup Enterprise Suite (multiplatform) | `smeup-es-mu` | `me-rpgle-smeuperp` | 3 DSL `kokos-dsl-smeuperp*` | no |

La voce «Packages» mostra i package installati; «Package Store» il catalogo
completo con lo stato di installazione, in sola lettura. La pagina del package
ha le voci Dettaglio (manifest), Configurazione (schemi dei micro executor),
Micro executors e DSL.

## Configurazioni package del dominio

Ogni dominio definisce in `public/data/application-domains.json` l'oggetto
`packageConfigurations`, indicizzato per nome package e poi per nome micro
executor, con i valori dello schema `applicativeDomain`. Package non associati
al dominio o micro executor non presenti nel package impediscono il caricamento. I valori
sono esempi mock e non vengono validati rispetto allo schema.

La voce «Configurazione» del dominio mostra, per ogni micro executor dei
package installati con uno schema `applicativeDomain`, le proprietà e i valori
del dominio. Le proprietà sono presentate come albero con tipo e descrizione;
composizioni alternative, riferimenti e proprietà dinamiche non vengono
espansi e sono segnalati nella vista. Per eseguire i test:
`node --experimental-strip-types --test tests/*.test.mjs` con Node.js 22.

## Health check

La voce «Health check» del dominio mostra tutti i suoi package, con un riepilogo degli stati e la causa per ogni errore.
I dati in `public/data/package-health.json` sono **simulati**: non viene
interrogato alcun servizio e gli stati non indicano la salute reale dei package.
Ogni record associa `domainId` e `packageId` (nome del package) a uno stato `healthy` oppure `error`;
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
