import React, { useState } from "react";
import { Popover } from "@mantine/core";
import { IconCheck, IconUsers, IconX } from "@tabler/icons-react";
import { getColorForStringHex, getDefaultPicture } from "../../utils/utils";
import styles from "./WaitingParticipantsPopover.module.css";

interface WaitingParticipantsPopoverProps {
  waitingList: WaitingGuest[];
  onAdmitUser?: (clientId: string) => void;
  onDeclineUser?: (clientId: string) => void;
  onAdmitAll?: () => void;
  children: React.ReactNode;
  position?:
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "top"
    | "top-start"
    | "top-end";
  opened?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  width?: number;
}

export const WaitingParticipantsPopover: React.FC<
  WaitingParticipantsPopoverProps
> = ({
  waitingList,
  onAdmitUser,
  onDeclineUser,
  onAdmitAll,
  children,
  position = "bottom-end",
  opened: controlledOpened,
  onOpen,
  onClose,
  width = 350,
}) => {
  const [uncontrolledOpened, setUncontrolledOpened] = useState(false);
  const isControlled = controlledOpened !== undefined;
  const opened = isControlled ? controlledOpened : uncontrolledOpened;

  const handleOpenChange = (newOpened: boolean) => {
    if (!isControlled) {
      setUncontrolledOpened(newOpened);
    }
    if (newOpened) {
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const count = waitingList?.length || 0;

  return (
    <Popover
      opened={opened}
      onChange={handleOpenChange}
      position={position}
      withArrow
      shadow="xl"
      withinPortal={true}
      zIndex={10000}
      width={width}
      classNames={{ dropdown: styles.dropdown }}
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <div className={styles.iconCircle}>
                <IconUsers size={16} stroke={2} />
              </div>
              <div className={styles.titleText}>
                <span className={styles.title}>Waiting Lounge</span>
                <span className={styles.countBadge}>{count}</span>
              </div>
            </div>
            <div className={styles.headerActions}>
              {onAdmitAll && count > 1 && (
                <button
                  type="button"
                  className={styles.admitAllBtn}
                  onClick={() => {
                    onAdmitAll();
                    handleOpenChange(false);
                  }}
                  title="Admit all waiting participants"
                >
                  <IconCheck size={13} stroke={2.5} />
                  <span>Admit All</span>
                </button>
              )}
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => handleOpenChange(false)}
                title="Close"
                aria-label="Close waiting lounge popover"
              >
                <IconX size={14} />
              </button>
            </div>
          </div>

          <div className={styles.list}>
            {count === 0 ? (
              <div className={styles.emptyState}>
                <span>No guests currently waiting in the lounge</span>
              </div>
            ) : (
              waitingList.map((guest) => {
                const guestName = guest.name || "Guest";
                const guestAvatar =
                  guest.picture ||
                  getDefaultPicture(
                    guestName,
                    getColorForStringHex(guest.clientId),
                  );

                return (
                  <div key={guest.clientId} className={styles.guestRow}>
                    <img
                      src={guestAvatar}
                      alt={guestName}
                      className={styles.avatar}
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getDefaultPicture(
                          guestName,
                          getColorForStringHex(guest.clientId),
                        );
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                    <div className={styles.meta}>
                      <span className={styles.name} title={guestName}>
                        {guestName}
                      </span>
                      <span className={styles.subtitle}>
                        <span className={styles.waitingDot} />
                        Waiting to join
                      </span>
                    </div>

                    <div className={styles.rowActions}>
                      {onAdmitUser && (
                        <button
                          type="button"
                          className={styles.admitBtn}
                          onClick={() => {
                            onAdmitUser(guest.clientId);
                            if (count <= 1) {
                              handleOpenChange(false);
                            }
                          }}
                          title={`Admit ${guestName}`}
                          aria-label={`Admit ${guestName}`}
                        >
                          <IconCheck size={14} stroke={2.5} />
                        </button>
                      )}
                      {onDeclineUser && (
                        <button
                          type="button"
                          className={styles.declineBtn}
                          onClick={() => {
                            onDeclineUser(guest.clientId);
                            if (count <= 1) {
                              handleOpenChange(false);
                            }
                          }}
                          title={`Decline ${guestName}`}
                          aria-label={`Decline ${guestName}`}
                        >
                          <IconX size={14} stroke={2} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};
