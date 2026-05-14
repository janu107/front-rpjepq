import { useEffect } from "react";

const applyResponsiveLabels = () => {
  const tables = document.querySelectorAll(".MuiTable-root");

  tables.forEach((table) => {
    const headers = Array.from(table.querySelectorAll("thead th")).map((header) =>
      header.textContent.trim()
    );

    if (!headers.length) return;

    table.querySelectorAll("tbody tr").forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const isEmptyRow = cells.length === 1 && Number(cells[0].getAttribute("colspan") || 1) > 1;

      if (isEmptyRow) {
        cells[0].setAttribute("data-empty-row", "true");
        return;
      }

      cells.forEach((cell, index) => {
        const label = headers[index] || "";
        if (label && cell.getAttribute("data-label") !== label) {
          cell.setAttribute("data-label", label);
        }
      });
    });
  });
};

const useResponsiveTableLabels = () => {
  useEffect(() => {
    applyResponsiveLabels();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyResponsiveLabels);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("resize", applyResponsiveLabels);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyResponsiveLabels);
    };
  }, []);
};

export default useResponsiveTableLabels;
