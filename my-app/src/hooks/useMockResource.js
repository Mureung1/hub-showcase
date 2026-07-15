import { useEffect, useState } from "react";

// 백엔드가 생기면 이 훅 대신 apiClient.get(path)를 쓰는 훅으로 교체한다.
export function useMockResource(mockData) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.resolve(mockData).then((res) => {
      setData(res);
      setIsLoading(false);
    });
  }, [mockData]);

  return { data, isLoading };
}
