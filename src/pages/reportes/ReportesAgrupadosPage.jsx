import { Paper, Stack, Tab, Tabs } from "@mui/material";
import { useSearchParams } from "react-router-dom";

// Varios reportes bajo un mismo menú, cada uno en su pestaña. La pestaña va en la
// dirección (?tab=...) para que se pueda volver directo a ella.
//   pestanas: [{ clave, label, elemento }]
const ReportesAgrupadosPage = ({ pestanas }) => {
  const [params, setParams] = useSearchParams();
  const indice = Math.max(0, pestanas.findIndex((p) => p.clave === params.get("tab")));
  const actual = pestanas[indice];

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ border: "1px solid #dde3ea" }} className="no-print">
        <Tabs value={indice} onChange={(_, i) => setParams({ tab: pestanas[i].clave })} variant="scrollable" scrollButtons="auto">
          {pestanas.map((p) => <Tab key={p.clave} label={p.label} />)}
        </Tabs>
      </Paper>
      {/* key: cada pestaña monta su reporte desde cero (filtros y datos propios). */}
      <div key={actual.clave}>{actual.elemento}</div>
    </Stack>
  );
};

export default ReportesAgrupadosPage;
