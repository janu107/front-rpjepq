import { Box, Stack, Typography } from "@mui/material";

const PageHeader = ({ title, subtitle, actions }) => (
  <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
    <Box>
      <Typography variant="h5">{title}</Typography>
      {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
    </Box>
    {actions && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>{actions}</Stack>}
  </Stack>
);

export default PageHeader;
