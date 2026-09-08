import React, { useContext, useState, useEffect } from "react";
import { Badge, Alert, Button, Loader } from "@mantine/core";
import { IconCirclePlusFilled, IconArrowLeft } from "@tabler/icons-react";
import { MetadataContext } from "../../MetadataContext";
import { useHistory } from "react-router-dom";
import { useRoomFormState, submitRoomCreation } from "./roomCreationDomain";
import { SharedRoomFields } from "./SharedRoomFields";
import styles from "./Create.module.css";

export const Create: React.FC = () => {
  const { user } = useContext(MetadataContext);
  const history = useHistory();
  const formState = useRoomFormState();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "Create a New Room - CoWatch";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      const video = new URLSearchParams(window.location.search).get("video") ?? "";
      const { finalRoomId } = await submitRoomCreation({
        user,
        formState,
        video,
      });

      window.location.assign(`/watch/${finalRoomId}`);
    } catch (err: any) {
      console.error("Room creation error:", err);
      setFormError(err.message || "Failed to create room.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Top Navigation */}
        <div className={styles.topNav}>
          <button
            type="button"
            className={styles.breadcrumbLink}
            onClick={() => history.push("/myrooms")}
          >
            <IconArrowLeft size={16} />
            <span>Back to My Rooms</span>
          </button>
          <Badge variant="light" color="violet" size="lg" radius="sm">
            New Watch Party
          </Badge>
        </div>


        {/* Responsive Grid Layout */}
        <div className={styles.layoutGrid}>
          {/* Left Column: Form Configuration */}
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Create a New Room</h1>
              <p className={styles.formSubtitle}>
                Configure your room identity, access security, and preferences. You can update these settings anytime while the room is active.
              </p>
            </div>

            {(formError || formState.error) && (
              <Alert color="red" mb="lg" title="Notice">
                {formError || formState.error}
              </Alert>
            )}

            <form id="create-room-form" onSubmit={handleSubmit}>
              <SharedRoomFields formState={formState} />

              <Button
                type="submit"
                size="lg"
                variant="gradient"
                gradient={{ from: "violet", to: "grape", deg: 135 }}
                disabled={loading || !formState.roomTitle.trim()}
                leftSection={loading ? <Loader size={20} color="white" /> : <IconCirclePlusFilled size={20} />}
                className={styles.createBtnPrimary}
                fullWidth
                mt="xl"
              >
                {loading ? "Creating..." : "Start Watch Party"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
