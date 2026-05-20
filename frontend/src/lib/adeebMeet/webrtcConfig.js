/** ICE servers — STUN + public TURN for NAT/firewall traversal */
export const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

export const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace(/\/api\/?$/, '');
};

/** Lighter capture — reduces GPU/CPU vs 720p@24fps */
export const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

export const VIDEO_CONSTRAINTS = {
    width: { ideal: 640, max: 854 },
    height: { ideal: 360, max: 480 },
    frameRate: { ideal: 15, max: 20 },
};

export const isDisplayMediaSupported = () =>
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia;

/** Mobile-friendly screen capture options */
export const getDisplayMediaOptions = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return {
        video: {
            displaySurface: 'monitor',
            width: { max: 1280 },
            height: { max: 720 },
            frameRate: { max: 15 },
        },
        audio: false,
        ...(isMobile && { preferCurrentTab: true, selfBrowserSurface: 'exclude' }),
    };
};

export const createDummyVideoTrack = () => {
    try {
        const canvas = Object.assign(document.createElement('canvas'), {
            width: 320,
            height: 180,
        });
        const ctx = canvas.getContext('2d');
        ctx?.fillRect(0, 0, 320, 180);
        const stream = canvas.captureStream?.(5) ?? canvas.webkitCaptureStream?.(5);
        const track = stream?.getVideoTracks()[0];
        if (track) track.enabled = false;
        return track ?? null;
    } catch {
        return null;
    }
};

export async function enumerateMediaDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
        return { audioInputs: [], videoInputs: [] };
    }
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInputs: devices.filter((d) => d.kind === 'audioinput'),
            videoInputs: devices.filter((d) => d.kind === 'videoinput'),
        };
    } catch {
        return { audioInputs: [], videoInputs: [] };
    }
}

export async function acquireMicrophoneTrack(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const audio = deviceId
        ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } }
        : AUDIO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: false,
    });
    const track = stream.getAudioTracks()[0];
    if (!track) return null;
    track.enabled = true;
    return track;
}

export async function acquireCameraTrack(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const video = deviceId
        ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } }
        : VIDEO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) return null;
    track.enabled = true;
    return track;
}

export const buildLocalMediaStream = async () => {
    let raw = null;

    const tryGetMedia = async (constraints) => {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            return null;
        }
    };

    raw = await Promise.race([
        tryGetMedia({ audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS }),
        tryGetMedia({ audio: AUDIO_CONSTRAINTS }),
        tryGetMedia({ video: VIDEO_CONSTRAINTS }),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);

    const stream = new MediaStream();
    let hasAudio = false;
    let hasVideo = false;

    let audio = raw?.getAudioTracks()[0];
    if (!audio) {
        try {
            audio = await acquireMicrophoneTrack();
        } catch {
            audio = null;
        }
    }
    if (audio) {
        stream.addTrack(audio);
        hasAudio = true;
    }

    const video = raw?.getVideoTracks()[0];
    if (video) {
        try {
            await video.applyConstraints({
                width: { ideal: 640, max: 854 },
                height: { ideal: 360, max: 480 },
                frameRate: { ideal: 15, max: 20 },
            });
        } catch {
            /* use device default */
        }
        stream.addTrack(video);
        hasVideo = true;
    } else {
        const dummy = createDummyVideoTrack();
        if (dummy) stream.addTrack(dummy);
    }

    return { stream, hasAudio, hasVideo };
};

export const resolveAvatarUrl = (photo, name, serverUrl) => {
    if (photo) {
        return photo.startsWith('http') ? photo : `${serverUrl}/${photo.replace(/^\//, '')}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=ff8e01&color=fff`;
};
