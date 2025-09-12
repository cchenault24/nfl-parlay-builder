import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
  Button,
  Alert,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Save as SaveIcon,
  Login as LoginIcon,
} from "@mui/icons-material";
import type { GeneratedParlay } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { saveParlayToUser } from "../../config/firebase";
import { AuthModal } from "../auth/AuthModal";
import ParlayLoading from "./ParlayLoading";
import ParlayLanding from "./ParlayLanding";
import ParlayLegView from "./ParlayLegView";
import ParlayDisplayFooter from "./ParlayDisplayFooter";

interface ParlayDisplayProps {
  parlay?: GeneratedParlay;
  loading: boolean;
}

const ParlayDisplay: React.FC<ParlayDisplayProps> = ({ parlay, loading }) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSaveParlay = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!parlay) return;

    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      await saveParlayToUser(user.uid, parlay);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Clear success message after 3 seconds
    } catch (error) {
      setSaveError("Failed to save parlay. Please try again.");
      console.error("Error saving parlay:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ParlayLoading />;
  }

  if (!parlay) {
    return <ParlayLanding />;
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            <Typography variant="h6">AI Generated Parlay</Typography>
            <Box sx={{ ml: "auto" }}>
              <Chip
                label={parlay.estimatedOdds}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          {/* Save/Success/Error Messages */}
          {saveSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Parlay saved successfully! Check your history to view it again.
            </Alert>
          )}

          {saveError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setSaveError("")}
            >
              {saveError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {parlay.legs.map((leg, index) => (
              <ParlayLegView key={leg.id} leg={leg} index={index} />
            ))}
          </Grid>

          <Divider sx={{ my: 2 }} />

          <ParlayDisplayFooter />
        </CardContent>
      </Card>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default ParlayDisplay;
