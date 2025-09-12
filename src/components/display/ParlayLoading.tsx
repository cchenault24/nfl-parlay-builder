import { Card, CardContent, CircularProgress, Typography } from "@mui/material";

const ParlayLoading: React.FC = () => (
  <Card>
    <CardContent sx={{ textAlign: "center", py: 4 }}>
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        AI is analyzing stats and generating your parlay...
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        This may take 10-15 seconds
      </Typography>
    </CardContent>
  </Card>
);

export default ParlayLoading;
