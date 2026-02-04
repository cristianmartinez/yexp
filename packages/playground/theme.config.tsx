import React from 'react'

const config = {
  logo: <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Jext</span>,
  project: {
    link: 'https://github.com/cristianmartinez/Expr',
  },
  docsRepositoryBase: 'https://github.com/cristianmartinez/Expr/tree/main/packages/playground',
  footer: {
    text: 'Jext Expression Engine',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Jext'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Jext" />
      <meta property="og:description" content="A fast, deterministic expression language" />
    </>
  ),
  primaryHue: 210,
  darkMode: true,
}

export default config
