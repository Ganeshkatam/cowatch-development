import { useState, useEffect } from "react";
import { createRoom } from "../TopBar/TopBar";
import { supabase, getAccessToken } from "../../utils/supabaseClient";
import { serverPath, addAndSavePasscode } from "../../utils/utils";

export interface RoomFormState {
  roomTitle: string;
  setRoomTitle: (v: string) => void;
  roomDescription: string;
  setRoomDescription: (v: string) => void;
  passcode: string;
  setPasscode: (v: string) => void;
  isChatDisabled: boolean;
  setIsChatDisabled: (v: boolean) => void;
  lock: boolean;
  setLock: (v: boolean) => void;
  isPermanent: boolean;
  setIsPermanent: (v: boolean) => void;
  isWaitingLoungeEnabled: boolean;
  setIsWaitingLoungeEnabled: (v: boolean) => void;
  durationMinutes: string;
  setDurationMinutes: (v: string) => void;
  coverPhotoFile: File | null;
  coverPreview: string | null;
  handleCoverChange: (file: File | null) => void;
  handleRemoveCover: () => void;
  error: string;
  setError: (v: string) => void;
}

export function useRoomFormState(): RoomFormState {
  const [roomTitle, setRoomTitle] = useState("Watch Party");
  const [roomDescription, setRoomDescription] = useState("");
  const [passcode, setPasscode] = useState("");

  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [lock, setLock] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);
  const [isWaitingLoungeEnabled, setIsWaitingLoungeEnabled] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState<string>("300");
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const handleCoverChange = (file: File | null) => {
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setError("Cover photo too large (max 1MB).");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Selected file must be an image.");
        return;
      }
      setError("");
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview);
      }
      setCoverPhotoFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveCover = () => {
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverPhotoFile(null);
    setCoverPreview(null);
  };

  return {
    roomTitle,
    setRoomTitle,
    roomDescription,
    setRoomDescription,
    passcode,
    setPasscode,
    isChatDisabled,
    setIsChatDisabled,
    lock,
    setLock,
    isPermanent,
    setIsPermanent,
    isWaitingLoungeEnabled,
    setIsWaitingLoungeEnabled,
    durationMinutes,
    setDurationMinutes,
    coverPhotoFile,
    coverPreview,
    handleCoverChange,
    handleRemoveCover,
    error,
    setError,
  };
}

export interface SubmitRoomOptions {
  user: any;
  formState: RoomFormState;
  scheduledStartsAt?: string;
  video?: string;
}

export async function submitRoomCreation({
  user,
  formState,
  scheduledStartsAt,
  video = "",
}: SubmitRoomOptions): Promise<{ finalRoomId: string }> {
  const trimmedTitle = formState.roomTitle.trim();
  if (!trimmedTitle) {
    throw new Error("Room title is required.");
  }
  if (trimmedTitle.length > 50) {
    throw new Error("Room title cannot exceed 50 characters.");
  }

  if (scheduledStartsAt) {
    const scheduledDate = new Date(scheduledStartsAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error("Invalid scheduled start time.");
    }
    if (scheduledDate.getTime() <= Date.now()) {
      throw new Error("Scheduled start time must be in the future.");
    }
  }

  const roomName = await createRoom(
    user,
    false,
    video,
    {
      roomTitle: trimmedTitle,
      roomDescription: formState.roomDescription.trim() || undefined,
      passcode: formState.passcode || undefined,
      isPermanent: formState.isPermanent,
      durationMinutes: formState.isPermanent ? undefined : Number(formState.durationMinutes),
      isChatDisabled: formState.isChatDisabled,
      isWaitingLoungeEnabled: formState.isWaitingLoungeEnabled,
      lock: formState.lock,
      noRedirect: true,
      scheduledStartsAt,
    }
  );

  if (formState.passcode) {
    addAndSavePasscode(roomName, formState.passcode);
  }

  if (formState.coverPhotoFile && user) {
    try {
      const fileExt = formState.coverPhotoFile.name.split('.').pop() || "jpg";
      const safeRoomId = roomName.startsWith("/") ? roomName.substring(1) : roomName;
      const filePath = `${user.id}/${safeRoomId}/cover.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('room_covers')
        .upload(filePath, formState.coverPhotoFile);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('room_covers').getPublicUrl(filePath);
        await fetch(`${serverPath}/updateRoomCover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.id,
            token: await getAccessToken(),
            roomId: roomName,
            coverPhoto: publicUrlData.publicUrl
          })
        }).catch(e => console.error("Failed to update room cover", e));
      } else {
        console.error("Cover upload failed:", uploadError);
      }
    } catch (coverErr) {
      console.error("Cover storage error:", coverErr);
    }
  }

  const finalRoomId = roomName.startsWith("/") ? roomName.substring(1) : roomName;

  // For immediate rooms, start the session lifecycle upon creation so the room is active before entering
  if (!scheduledStartsAt && user?.id) {
    try {
      const token = await getAccessToken();
      await fetch(`${serverPath}/startRoom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.id,
          token,
          roomId: finalRoomId,
        }),
      });
    } catch (startErr) {
      console.warn("Auto-start on room creation error:", startErr);
    }
  }

  return { finalRoomId };
}

export function getLocalTimezoneDisplay(): string {
  try {
    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Time";
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60).toString().padStart(2, "0");
    const minutes = (absMinutes % 60).toString().padStart(2, "0");
    return `${tzName} (UTC${sign}${hours}:${minutes})`;
  } catch (e) {
    return "Local Time";
  }
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
