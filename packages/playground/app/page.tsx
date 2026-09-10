import { InstallCommand, QueryPreview } from '@/components/query-preview';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const integration = `import { compile, evaluate } from '@cristianmartinez/yexp';

const eligible = compile(
  '$.total >= 100 && $.member'
);

evaluate(eligible, { total: 150, member: true });
// true

evaluate(eligible, { total: 50, member: true });
// false`;

const expressions = [
  {
    title: 'Read nested data',
    description: 'Access properties, with a fallback for missing values.',
    expression: '$.user.profile.name ?? "Anonymous"',
  },
  {
    title: 'Select what you need',
    description: 'Filter a collection and pick a field from each match.',
    expression: '$.orders[.paid][*].total',
  },
  {
    title: 'Compose a transformation',
    description: 'Pass results from one operation to the next.',
    expression: '$.users |> filter(.active) |> map(.name)',
  },
];

export default function HomePage() {
  return (
    <div className="marketing-site">
      <a className="site-skip" href="#main-content">
        Skip to content
      </a>
      <header className="site-container site-header">
        <Link href="/" className="wordmark" aria-label="Yexp home">
          <Image src="/yexp-logo.svg" alt="" width={28} height={28} />
          yexp
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/docs">Documentation</Link>
          <a href="https://github.com/cristianmartinez/yexp">
            GitHub <ArrowUpRight size={14} />
          </a>
          <Link href="/play" className="nav-playground">
            Playground <ArrowRight size={15} />
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <section className="site-container hero">
          <div className="intro">
            <h1>
              An expression
              <br />
              language
              <br />
              for <span>JSON.</span>
            </h1>
            <p>
              Query data and evaluate rules with JavaScript-style syntax. Embed Yexp in your
              application or use it from the terminal.
            </p>
            <div className="intro-actions">
              <Link className="site-button" href="/docs/getting-started">
                Get started <ArrowRight size={17} />
              </Link>
              <Link className="secondary-link" href="/docs/syntax">
                Explore the syntax
              </Link>
            </div>
            <InstallCommand />
          </div>
          <div className="hero-example">
            <div className="example-heading">
              <h2>Try an expression</h2>
              <Link href="/play" aria-label="Open full playground">
                <ArrowUpRight size={19} />
              </Link>
            </div>
            <QueryPreview />
          </div>
        </section>
        <section className="site-container language-section" aria-labelledby="language-heading">
          <div className="section-heading">
            <h2 id="language-heading">
              From property access
              <br />
              to a complete query.
            </h2>
            <p>
              Use familiar operators and arrow functions, with selectors and pipes for working
              through collections.
            </p>
          </div>
          <div className="expression-list">
            {expressions.map((item) => (
              <div className="expression-row" key={item.title}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <code>{item.expression}</code>
              </div>
            ))}
          </div>
        </section>
        <section className="integration-section">
          <div className="site-container integration-grid">
            <div className="section-copy">
              <h2>
                Write the rule once.
                <br />
                Evaluate it with
                <br />
                different data.
              </h2>
              <p>
                Compile an expression into reusable bytecode. Store it, pass it between services, or
                evaluate it against a new input.
              </p>
              <p>
                Yexp runs its own virtual machine without <code>eval()</code>. Application data
                enters through explicit <code>$</code>, <code>$context</code>, and <code>$env</code>{' '}
                roots.
              </p>
              <Link className="secondary-link" href="/docs/architecture">
                How the runtime works <ArrowRight size={16} />
              </Link>
            </div>
            <div className="integration-code">
              <div className="code-caption">
                app.ts <span>TypeScript</span>
              </div>
              <pre>
                <code>{integration}</code>
              </pre>
            </div>
          </div>
        </section>
        <section className="site-container terminal-section">
          <div className="section-copy">
            <h2>Use it in the terminal, too.</h2>
            <p>Read JSON from stdin or files. Write the result to stdout.</p>
            <Link className="secondary-link" href="/docs/getting-started#use-yexp-in-the-terminal">
              CLI documentation <ArrowRight size={16} />
            </Link>
          </div>
          <pre className="terminal-code">
            <code>
              <span className="code-muted">{'$ '}</span>
              {`echo '{"name":"Ada"}' | npx @cristianmartinez/yexp-cli '.name'\n`}
              <span className="terminal-output">{'"Ada"'}</span>
            </code>
          </pre>
        </section>
      </main>
      <footer className="site-container site-footer">
        <div>
          <Link href="/" className="footer-brand">
            yexp
          </Link>
          <span>MIT licensed</span>
        </div>
        <nav aria-label="Further reading">
          <Link href="/docs/syntax">Language guide</Link>
          <Link href="/docs/spec">Specification</Link>
          <Link href="/docs/vm-execution">VM visualizer</Link>
        </nav>
      </footer>
    </div>
  );
}
