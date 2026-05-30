import React, { useState, useEffect } from "react";

function LoadingDot() {
  // 表示するドット数を保持
  const [dot, setDot] = useState(0);

  // 表示中だけインターバルでドット数を更新
  useEffect(() => {
    const interval = setInterval(() => {
      setDot((prev) => (prev + 1) % 4);
    }, 1000);

    return () => clearInterval(interval); // クリーンアップでタイマー解除
  }, []);

  return <span>{".".repeat(dot)}</span>;
}

export default LoadingDot;
