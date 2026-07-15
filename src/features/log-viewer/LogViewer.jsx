import { useEffect, useState } from "react";
import Card from "../../components/Card.jsx";
import Badge from "../../components/Badge.jsx";
import Table from "../../components/Table.jsx";
import { fetchLogs } from "../../api/logs.js";
import "./LogViewer.css";

const COLUMNS = [
  { key: "timestamp", label: "시간", render: (row) => formatTime(row.timestamp) },
  {
    key: "detections",
    label: "탐지 항목",
    render: (row) => (row.detections.length > 0 ? row.detections.join(", ") : "-"),
  },
  {
    key: "action",
    label: "조치 결과",
    render: (row) => <Badge status={row.action} />,
  },
];

function formatTime(iso) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="log-viewer">
      <h1 className="log-viewer__title">탐지 로그</h1>
      <Card>
        {loading ? (
          <p className="log-viewer__loading">불러오는 중...</p>
        ) : (
          <Table columns={COLUMNS} rows={logs} emptyMessage="탐지 로그가 없습니다." />
        )}
      </Card>
    </div>
  );
}
