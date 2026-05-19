import { ICE_SERVERS } from './webrtcConfig';

/**
 * Mesh WebRTC manager with perfect negotiation (avoids offer/answer glare).
 * Each participant connects P2P to every other participant in the room.
 */
export class WebRTCMeetingManager {
    constructor({ socket, mySocketId, myUserDetails, localStream, onPeersChange, onParticipantsChange }) {
        this.socket = socket;
        this.mySocketId = mySocketId;
        this.myUserDetails = myUserDetails;
        this.localStream = localStream;
        this.onPeersChange = onPeersChange;
        this.onParticipantsChange = onParticipantsChange;

        /** @type {Map<string, { pc: RTCPeerConnection, userDetails: object, remoteStream: MediaStream, makingOffer: boolean, iceQueue: RTCIceCandidateInit[] }>} */
        this.peers = new Map();
        this.cameraVideoTrack = localStream?.getVideoTracks()[0] ?? null;
        this.screenTrack = null;
        this.destroyed = false;

        this._bindSocket();
    }

    _bindSocket() {
        this.socket.on('existing_classroom_users', (users) => {
            users.forEach(({ socketId, userDetails }) => {
                this._connectToPeer(socketId, userDetails, true);
            });
        });

        // New joiner always initiates via existing_classroom_users — wait for their offer
        this.socket.on('user_joined_classroom', () => {});

        this.socket.on('classroom_signal', async ({ signal, from, userDetails }) => {
            if (!from || from === this.mySocketId) return;
            await this._handleSignal(from, signal, userDetails);
        });

        this.socket.on('user_left_classroom', (socketId) => {
            this._removePeer(socketId);
        });

        this.socket.on('room_users_update', (users) => {
            this.onParticipantsChange?.(users);
        });

        this.socket.on('teacher_action', (data) => {
            if (data.action === 'kicked') {
                this.onKicked?.();
            } else if (data.action === 'force_mute') {
                this.onForceMute?.();
            }
        });

        this.socket.on('class_ended_by_teacher', () => {
            this.onClassEnded?.();
        });
    }

    _isPolite(remoteSocketId) {
        return this.mySocketId < remoteSocketId;
    }

    _emitPeers() {
        const list = Array.from(this.peers.entries()).map(([peerId, data]) => ({
            peerId,
            userDetails: data.userDetails,
            remoteStream: data.remoteStream,
            connectionState: data.pc.connectionState,
        }));
        this.onPeersChange?.(list);
    }

    _getOrCreatePeer(remoteSocketId, userDetails) {
        if (this.peers.has(remoteSocketId)) {
            return this.peers.get(remoteSocketId);
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        const remoteStream = new MediaStream();

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.localStream);
            });
        }

        const entry = {
            pc,
            userDetails: userDetails || { name: 'Guest' },
            remoteStream,
            makingOffer: false,
            iceQueue: [],
        };

        pc.ontrack = (event) => {
            event.streams[0]?.getTracks().forEach((track) => {
                const existing = remoteStream.getTracks().find((t) => t.kind === track.kind);
                if (existing) remoteStream.removeTrack(existing);
                remoteStream.addTrack(track);
            });
            if (!event.streams[0] && event.track) {
                const existing = remoteStream.getTracks().find((t) => t.kind === event.track.kind);
                if (existing) remoteStream.removeTrack(existing);
                remoteStream.addTrack(event.track);
            }
            this._emitPeers();
        };

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            this.socket.emit('classroom_signal', {
                to: remoteSocketId,
                signal: { type: 'ice', candidate: event.candidate.toJSON() },
                userDetails: this.myUserDetails,
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                try {
                    pc.restartIce?.();
                } catch {
                    /* ignore */
                }
            }
            this._emitPeers();
        };

        this.peers.set(remoteSocketId, entry);
        this._emitPeers();
        return entry;
    }

    async _flushIceQueue(entry) {
        const { pc, iceQueue } = entry;
        while (iceQueue.length > 0) {
            const candidate = iceQueue.shift();
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
                /* ignore stale candidates */
            }
        }
    }

    async _handleSignal(from, signal, userDetails) {
        if (this.destroyed) return;

        const entry = this._getOrCreatePeer(from, userDetails);
        const { pc } = entry;
        const polite = this._isPolite(from);

        if (signal?.type === 'ice' && signal.candidate) {
            if (!pc.remoteDescription) {
                entry.iceQueue.push(signal.candidate);
                return;
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch {
                /* ignore */
            }
            return;
        }

        if (signal?.type === 'offer') {
            const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
            if (offerCollision && !polite) return;

            if (offerCollision && polite) {
                try {
                    await pc.setLocalDescription({ type: 'rollback' });
                } catch {
                    /* ignore */
                }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            await this._flushIceQueue(entry);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.socket.emit('classroom_signal', {
                to: from,
                signal: pc.localDescription,
                userDetails: this.myUserDetails,
            });
            return;
        }

        if (signal?.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            await this._flushIceQueue(entry);
        }
    }

    async _connectToPeer(remoteSocketId, userDetails, asInitiator) {
        if (this.destroyed || remoteSocketId === this.mySocketId) return;
        if (this.peers.has(remoteSocketId)) return;

        const entry = this._getOrCreatePeer(remoteSocketId, userDetails);
        const { pc } = entry;

        if (!asInitiator) return;

        try {
            entry.makingOffer = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit('classroom_signal', {
                to: remoteSocketId,
                signal: pc.localDescription,
                userDetails: this.myUserDetails,
            });
        } catch (err) {
            console.error('Offer failed:', err);
            this._removePeer(remoteSocketId);
        } finally {
            entry.makingOffer = false;
        }
    }

    _removePeer(socketId) {
        const entry = this.peers.get(socketId);
        if (!entry) return;
        try {
            entry.pc.close();
        } catch {
            /* ignore */
        }
        this.peers.delete(socketId);
        this._emitPeers();
    }

    setMuted(muted) {
        const track = this.localStream?.getAudioTracks()[0];
        if (track) track.enabled = !muted;
    }

    setVideoEnabled(enabled) {
        const track = this.localStream?.getVideoTracks()[0];
        if (track && track.readyState === 'live') track.enabled = enabled;
    }

    async startScreenShare() {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            throw new Error('Screen sharing not supported');
        }

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: false,
        });
        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) throw new Error('No screen track');

        this.screenTrack = screenTrack;
        if (!this.cameraVideoTrack) {
            this.cameraVideoTrack = this.localStream?.getVideoTracks()[0] ?? null;
        }

        for (const [, { pc }] of this.peers) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(screenTrack);
        }

        const localVideo = this.localStream?.getVideoTracks()[0];
        if (localVideo && localVideo !== screenTrack) {
            this.localStream.removeTrack(localVideo);
        }
        if (!this.localStream.getVideoTracks().includes(screenTrack)) {
            this.localStream.addTrack(screenTrack);
        }

        screenTrack.onended = () => {
            this.stopScreenShare().catch(() => {});
        };

        return displayStream;
    }

    async stopScreenShare() {
        const screenTrack = this.screenTrack;
        this.screenTrack = null;

        let cameraTrack = this.cameraVideoTrack;
        if (!cameraTrack || cameraTrack.readyState === 'ended') {
            try {
                const cam = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                });
                cameraTrack = cam.getVideoTracks()[0];
                this.cameraVideoTrack = cameraTrack;
            } catch {
                cameraTrack = createDummyVideoTrackFallback();
            }
        }

        for (const [, { pc }] of this.peers) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
        }

        if (screenTrack) {
            try {
                screenTrack.stop();
            } catch {
                /* ignore */
            }
            if (this.localStream?.getVideoTracks().includes(screenTrack)) {
                this.localStream.removeTrack(screenTrack);
            }
        }

        if (cameraTrack && this.localStream && !this.localStream.getVideoTracks().includes(cameraTrack)) {
            this.localStream.addTrack(cameraTrack);
        }
    }

    kickUser(targetSocketId) {
        this.socket.emit('teacher_control', {
            roomId: this.roomId,
            action: 'kick_user',
            targetSocketId,
        });
    }

    muteUser(targetSocketId) {
        this.socket.emit('teacher_control', {
            roomId: this.roomId,
            action: 'mute_user',
            targetSocketId,
        });
    }

    endClassForEveryone() {
        this.socket.emit('teacher_control', {
            roomId: this.roomId,
            action: 'end_class',
        });
    }

    sendChatMessage(roomId, message) {
        this.socket.emit('classroom_message', message);
    }

    joinRoom(roomId) {
        this.roomId = roomId;
        this.socket.emit('join_classroom', roomId, this.myUserDetails);
    }

    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('leave_classroom', this.roomId);
        }
    }

    destroy() {
        this.destroyed = true;
        this.leaveRoom();
        for (const [id] of this.peers) {
            this._removePeer(id);
        }
        this.peers.clear();
        this.socket.off('existing_classroom_users');
        this.socket.off('user_joined_classroom');
        this.socket.off('classroom_signal');
        this.socket.off('user_left_classroom');
        this.socket.off('room_users_update');
        this.socket.off('teacher_action');
        this.socket.off('class_ended_by_teacher');
    }
}

function createDummyVideoTrackFallback() {
    const canvas = Object.assign(document.createElement('canvas'), { width: 640, height: 480 });
    const ctx = canvas.getContext('2d');
    ctx?.fillRect(0, 0, 640, 480);
    return canvas.captureStream(10).getVideoTracks()[0];
}
