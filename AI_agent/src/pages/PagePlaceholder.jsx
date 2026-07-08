import Header from "../components/layout/Header";

function PagePlaceholder({ title, description, items = [] }) {
  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.content}>
        <p style={styles.badge}>Career Mission</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.description}>{description}</p>

        {items.length > 0 && (
          <div style={styles.cardGrid}>
            {items.map((item) => (
              <article key={item.title} style={styles.card}>
                <strong style={styles.cardTitle}>{item.title}</strong>
                <span style={styles.cardText}>{item.text}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  content: {
    width: "min(1040px, calc(100% - clamp(32px, 6vw, 96px)))",
    margin: "0 auto",
    padding: "clamp(54px, 8vw, 96px) 0",
  },
  badge: {
    display: "inline-block",
    margin: "0 0 18px",
    padding: "8px 13px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  title: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: "clamp(32px, 5vw, 48px)",
    fontWeight: 800,
    lineHeight: 1.15,
  },
  description: {
    maxWidth: "720px",
    margin: "0 0 32px",
    color: "#475569",
    fontSize: "18px",
    lineHeight: 1.7,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  card: {
    minHeight: "112px",
    padding: "20px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.72)",
    border: "1px solid rgba(226, 232, 240, 0.88)",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.08)",
  },
  cardTitle: {
    display: "block",
    marginBottom: "8px",
    color: "#0f172a",
    fontSize: "16px",
  },
  cardText: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.55,
  },
};

export default PagePlaceholder;
