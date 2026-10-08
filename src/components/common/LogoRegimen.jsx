import { Box } from "@mui/material";
import { useState } from "react";

// Logo del régimen. Lo sirve el backend desde back-rpjepq/assets/logo-regimen.png
// (el mismo archivo que usan los PDF), así hay un solo lugar donde colocarlo.
// Si todavía no se ha subido, no se muestra nada.
const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

const LogoRegimen = ({ sx }) => {
  const [error, setError] = useState(false);
  if (error) return null;
  return (
    <Box
      component="img"
      src={`${base}/logo`}
      alt="Logo del régimen"
      onError={() => setError(true)}
      sx={{ objectFit: "contain", ...sx }}
    />
  );
};

export default LogoRegimen;
