import React, { useState, useEffect } from "react";
import { Modal, ActionIcon, Button, Text, Group, Tooltip, Tabs } from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconBrandWhatsapp,
  IconBrandTelegram,
  IconMail,
  IconHash,
  IconQrcode,
  IconShare,
  IconBrandGmail,
  IconBrandYahoo,
} from "@tabler/icons-react";
import { serverPath } from "../../utils/utils";
import { getAccessToken, supabase } from "../../utils/supabaseClient";

export const InviteModal = ({
  roomId,
  closeInviteModal,
}: {
  roomId?: string;
  closeInviteModal: () => void;
}) => {
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [roomIdCopied, setRoomIdCopied] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState<boolean>(true);
  const [invitationCopied, setInvitationCopied] = useState(false);
  const [hostName, setHostName] = useState<string>("A friend");

  const pathParts = window.location.pathname.split("/");
  const roomIdOrVanity = roomId || pathParts[pathParts.length - 1] || "";
  const cleanRoomId = roomIdOrVanity.replace(/^\//, "");

  useEffect(() => {
    let isMounted = true;
    const createInvite = async () => {
      try {
        const token = await getAccessToken();
        const user = await supabase.auth.getUser();
        const uid = user?.data?.user?.id;
        const name = user?.data?.user?.user_metadata?.name || user?.data?.user?.user_metadata?.display_name || "A friend";
        
        if (isMounted) setHostName(name);

        if (!uid || !token) {
          if (isMounted) setLoadingInvite(false);
          return;
        }
        const res = await fetch(`${serverPath}/createInvite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, token, roomId: cleanRoomId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.inviteToken) {
            setInviteToken(data.inviteToken);
          }
        }
      } catch (err) {
        console.warn("Could not generate tokenized invite link:", err);
      } finally {
        if (isMounted) setLoadingInvite(false);
      }
    };
    void createInvite();
    return () => {
      isMounted = false;
    };
  }, [cleanRoomId]);

  const baseUrl = window.location.origin + window.location.pathname;
  const fullUrl = inviteToken
    ? `${baseUrl}?invite=${encodeURIComponent(inviteToken)}`
    : baseUrl;

  const invitationText = `${hostName} is inviting you to a CoWatch Watch Party.

Topic: ${hostName}'s Watch Party
Join Watch Party
${fullUrl}

Room ID: ${roomIdOrVanity}`;

  const handleCopyInviteLink = () => {
    void navigator.clipboard.writeText(fullUrl);
    setInviteLinkCopied(true);
    setTimeout(() => setInviteLinkCopied(false), 2000);
  };

  const handleCopyInvitation = () => {
    void navigator.clipboard.writeText(invitationText);
    setInvitationCopied(true);
    setTimeout(() => setInvitationCopied(false), 2000);
  };

  const handleCopyRoomId = () => {
    void navigator.clipboard.writeText(roomIdOrVanity);
    setRoomIdCopied(true);
    setTimeout(() => setRoomIdCopied(false), 2000);
  };

  const subject = encodeURIComponent(`${hostName}'s CoWatch Party`);
  const bodyText = encodeURIComponent(invitationText);
  
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(invitationText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(invitationText)}`;
  
  const mailtoUrl = `mailto:?subject=${subject}&body=${bodyText}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${bodyText}`;
  const yahooUrl = `http://compose.mail.yahoo.com/?to=&subj=${subject}&body=${bodyText}`;
  
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(fullUrl)}`;

  return (
    <Modal
      opened
      centered
      size="lg"
      onClose={closeInviteModal}
      title="Invite People"
      styles={{
        content: {
          background: "rgba(10, 13, 20, 0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          color: "var(--text-primary)",
        },
        header: {
          background: "transparent",
          color: "var(--text-primary)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "16px",
          marginBottom: "16px",
        },
        title: {
          fontWeight: 600,
          fontSize: "18px",
        },
        close: {
          color: "var(--text-primary)",
          '&:hover': {
            background: "rgba(255, 255, 255, 0.1)",
          }
        }
      }}
    >
      <Tabs defaultValue="email" variant="pills" color="violet">
        <Tabs.List grow justify="center" mb="md">
          <Tabs.Tab value="email" leftSection={<IconMail size={16} />}>
            Email
          </Tabs.Tab>
          <Tabs.Tab value="social" leftSection={<IconShare size={16} />}>
            Social Share
          </Tabs.Tab>
          <Tabs.Tab value="qrcode" leftSection={<IconQrcode size={16} />}>
            QR Code
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="email" pt="md" pb="lg" style={{ minHeight: "150px" }}>
          <Text size="sm" c="dimmed" mb="lg" ta="center">
            Send an invitation to your friends via your favorite email client.
          </Text>
          <Group justify="center" gap="md">
            <Button component="a" href={mailtoUrl} color="gray" variant="light" leftSection={<IconMail size={18} />} size="md">
              Default Email
            </Button>
            <Button component="a" href={gmailUrl} target="_blank" rel="noopener noreferrer" color="red" variant="light" leftSection={<IconBrandGmail size={18} />} size="md">
              Gmail
            </Button>
            <Button component="a" href={yahooUrl} target="_blank" rel="noopener noreferrer" color="violet" variant="light" leftSection={<IconBrandYahoo size={18} />} size="md">
              Yahoo Mail
            </Button>
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="social" pt="md" pb="lg" style={{ minHeight: "150px" }}>
          <Text size="sm" c="dimmed" mb="lg" ta="center">
            Share your watch party link instantly via messaging apps.
          </Text>
          <Group justify="center" gap="md">
            <Button
              component="a"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              color="green"
              variant="light"
              leftSection={<IconBrandWhatsapp size={18} />}
              size="md"
            >
              WhatsApp
            </Button>
            <Button
              component="a"
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              color="blue"
              variant="light"
              leftSection={<IconBrandTelegram size={18} />}
              size="md"
            >
              Telegram
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button
                onClick={() => {
                  navigator.share({
                    title: `${hostName}'s CoWatch Party`,
                    text: invitationText,
                    url: fullUrl,
                  }).catch(() => {});
                }}
                color="violet"
                variant="light"
                leftSection={<IconShare size={18} />}
                size="md"
              >
                Share Menu
              </Button>
            )}
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="qrcode" pt="sm" pb="sm" style={{ minHeight: "150px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img
              src={qrCodeUrl}
              alt="Room QR Code"
              style={{
                borderRadius: "8px",
                border: "8px solid white",
                boxShadow: "var(--shadow-sm)",
                width: "160px",
                height: "160px",
              }}
            />
            <Text size="xs" c="dimmed" mt="md">
              Scan with a mobile camera to join instantly
            </Text>
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* Footer bar matches Zoom style bottom sticky actions */}
      <div style={{
        marginTop: "16px",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Group gap="sm">
          <Button
            variant="light"
            color={inviteLinkCopied ? "green" : "violet"}
            onClick={handleCopyInviteLink}
            leftSection={inviteLinkCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          >
            Copy Link
          </Button>
          <Button
            variant="light"
            color={invitationCopied ? "green" : "violet"}
            onClick={handleCopyInvitation}
            leftSection={invitationCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          >
            Copy Invitation
          </Button>
        </Group>
        
        <Text size="sm" c="dimmed" fw={500}>
          ID: {roomIdOrVanity}
        </Text>
      </div>
    </Modal>
  );
};
