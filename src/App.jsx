const details = [
  "React application entry is wired through src/main.jsx.",
  "Vite provides the local dev server and production build.",
  "No routing, styling framework, or state library is included.",
];

export default function App() {
  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">React Starter</p>
        <h1 id="page-title">Minimal React setup</h1>
        <p className="summary">
          A small starting point for building this project with React.
        </p>
      </section>

      <section className="details" aria-label="Project setup details">
        {details.map((detail) => (
          <p key={detail}>{detail}</p>
        ))}
      </section>
    </main>
  );
}
