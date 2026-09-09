import React from "react";
import { Button, Alert, PasswordInput } from "@mantine/core";
import {
  IconPlayerPlayFilled,
  IconLock,
  IconUsers,
  IconAlertCircle,
  IconLogin,
  IconUserPlus,
} from "@tabler/icons-react";
import styles from "../JoinRoom.module.css";

interface AdmissionConsoleProps {
  roomId: string;
  requirement: "none" | "passcode" | "authentication" | "locked";
  passcode: string;
  onPasscodeChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  isWaitingLoungeEnabled: boolean;
  onNavigateLogin: () => void;
  onNavigateSignup: () => void;
}

export const AdmissionConsole: React.FC<AdmissionConsoleProps> = ({
  requirement,
  passcode,
  onPasscodeChange,
  onSubmit,
  submitting,
  error,
  isWaitingLoungeEnabled,
  onNavigateLogin,
  onNavigateSignup,
}) => {
  return (
    <div className={styles.consolePanel}>
      <div className={styles.consoleHeader}>
        <span className={styles.consoleEyebrow}>SCREENING ADMISSION</span>
        <h2 className={styles.consoleHeading}>
          {requirement === "locked"
            ? "Room Locked"
            : requirement === "authentication"
            ? "Account Required"
            : "Join Watch Party"}
        </h2>
        <p className={styles.consoleSubheading}>
          {requirement === "locked"
            ? "The host has locked this room to prevent new entries."
            : requirement === "authentication"
            ? "Sign in to enter this private watch party."
            : requirement === "passcode"
            ? "Enter the room passcode to access the screening."
            : "You are invited to join the screening session."}
        </p>
      </div>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          className={styles.errorBanner}
        >
          {error}
        </Alert>
      )}

      {requirement === "locked" ? (
        <div className={styles.loungeAdvisory} style={{ marginTop: '20px' }}>
          <IconLock size={15} className={styles.statusIconViolet} />
          <span>This room is currently locked by the host. Please check back later.</span>
        </div>
      ) : requirement === "authentication" ? (
        <div className={styles.authActionGroup}>
          <Button
            onClick={onNavigateLogin}
            fullWidth
            size="md"
            color="violet"
            leftSection={<IconLogin size={18} />}
            className={styles.primaryActionButton}
          >
            Sign In to Join
          </Button>
          <Button
            onClick={onNavigateSignup}
            fullWidth
            size="md"
            variant="light"
            color="violet"
            leftSection={<IconUserPlus size={18} />}
            className={styles.secondaryButton}
          >
            Create Account
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(e);
          }}
          className={styles.admissionForm}
        >
          {requirement === "passcode" && (
            <div className={styles.formFieldGroup}>
              <label htmlFor="room-passcode" className={styles.fieldLabel}>
                Room Passcode
              </label>
              <PasswordInput
                id="room-passcode"
                value={passcode}
                onChange={(e) => onPasscodeChange(e.currentTarget.value)}
                placeholder="Enter passcode"
                size="md"
                disabled={submitting}
                leftSection={<IconLock size={16} />}
                classNames={{
                  input: styles.passcodeInput,
                }}
                autoFocus
              />
            </div>
          )}

          {isWaitingLoungeEnabled && (
            <div className={styles.loungeAdvisory}>
              <IconUsers size={15} className={styles.statusIconViolet} />
              <span>
                Waiting Lounge enabled. You will hold in the lounge until admitted
                by the host.
              </span>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            color="violet"
            loading={submitting}
            disabled={requirement === "passcode" && !passcode.trim()}
            leftSection={<IconPlayerPlayFilled size={18} />}
            className={styles.primaryActionButton}
          >
            {requirement === "passcode" ? "Enter Watch Party" : "Join Watch Party"}
          </Button>
        </form>
      )}
    </div>
  );
};
