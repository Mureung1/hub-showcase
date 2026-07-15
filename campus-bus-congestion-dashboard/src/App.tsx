import { Dashboard } from './components/Dashboard';
import styles from './App.module.css';

function App() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Dashboard />
      </div>
    </div>
  );
}

export default App;
