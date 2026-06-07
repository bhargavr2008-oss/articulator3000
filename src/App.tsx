import "./App.css";

function App() {
  return (
    <main>
      <p className="eyebrow">INDYHAX 2026</p>
      <h1>Ready for the idea.</h1>
      <p className="intro">
        A clean React and TypeScript starting point. Define the problem, build
        the smallest useful demo, and iterate from there.
      </p>

      <section aria-labelledby="starting-line">
        <h2 id="starting-line">Starting line</h2>
        <ol>
          <li>Write the idea and demo goal in IDEA.md.</li>
          <li>Replace this launchpad in src/App.tsx.</li>
          <li>Run npm run check before the demo.</li>
        </ol>
      </section>

      <div className="status">
        <span aria-hidden="true" />
        Development environment ready
      </div>
    </main>
  );
}

export default App;
