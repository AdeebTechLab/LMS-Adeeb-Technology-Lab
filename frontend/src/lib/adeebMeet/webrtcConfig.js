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
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

export const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return rawUrl.replace(/\/api\/?$/, '');
};

export const createDummyVideoTrack = () => {
    try {
        const canvas = Object.assign(document.createElement('canvas'), {
            width: 640,
            height: 480,
        });
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const stream = canvas.captureStream?.(10) ?? canvas.webkitCaptureStream?.(10);
        const track = stream?.getVideoTracks()[0];
        if (track) track.enabled = false;
        return track ?? null;
    } catch {
        return null;
    }
};

export const createDummyAudioTrack = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        const ctx = new AudioContext();
        const dst = ctx.createMediaStreamDestination();
        const track = dst.stream.getAudioTracks()[0];
        if (track) track.enabled = false;
        return track ?? null;
    } catch {
        return null;
    }
};

export const buildLocalMediaStream = async () => {
    let raw = null;
    try {
        raw = await Promise.race([
            navigator.mediaDevices
                ?.getUserMedia({
                    audio: true,
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 24 },
                    },
                })
                .catch(() =>
                    navigator.mediaDevices
                        ?.getUserMedia({ audio: true })
                        .catch(() => navigator.mediaDevices?.getUserMedia({ video: true }))
                ),
            new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
    } catch {
        raw = null;
    }

    const stream = new MediaStream();
    let hasAudio = false;
    let hasVideo = false;

    const audio = raw?.getAudioTracks()[0];
    if (audio) {
        stream.addTrack(audio);
        hasAudio = true;
    } else {
        const dummy = createDummyAudioTrack();
        if (dummy) stream.addTrack(dummy);
    }

    const video = raw?.getVideoTracks()[0];
    if (video) {
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
