import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Socket } from 'socket.io-client';
import { RootState } from '../redux/store';
import { connectCall, endCall } from '../redux/callSlice';
import { callAudio } from '../utils/callAudio';

const iceServers: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

export const useWebRTC = (socket: Socket | null) => {
  const dispatch = useDispatch();
  const { activeCall, incomingCall, isCaller, peerUser, callType, callId, callStatus } = useSelector(
    (state: RootState) => state.call
  );

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<any[]>([]);
  
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Tracks remote peer status overlays (mic muted, camera off, screenshare)
  const [peerStates, setPeerStates] = useState<{
    [userId: string]: { isMuted: boolean; isCameraOff: boolean; isSharingScreen: boolean };
  }>({});

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string>('');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Helper to cleanup streams/connections
  const cleanupCall = () => {
    callAudio.stop();
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsSharingScreen(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsSpeakerOn(true);
    setPeerStates({});
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams([]);
    iceCandidateQueueRef.current = [];
    pendingOfferRef.current = null;
  };

  // Enumerate video devices on call activation
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !currentVideoDeviceId) {
          setCurrentVideoDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };
    if (activeCall) {
      getDevices();
    }
  }, [activeCall, currentVideoDeviceId]);

  // Audio tone feedback cycle
  useEffect(() => {
    if (activeCall && callStatus === 'ringing') {
      if (isCaller) {
        callAudio.startDialingTone();
      } else {
        callAudio.startRingtone();
      }
    } else {
      callAudio.stop();
    }
    return () => {
      callAudio.stop();
    };
  }, [activeCall, callStatus, isCaller]);

  // Broadcast state changes helper
  const sendStateChange = (params: { isMuted: boolean; isCameraOff: boolean; isSharingScreen: boolean }) => {
    if (!socket || !peerUser) return;
    const payload = {
      callId,
      isMuted: params.isMuted,
      isCameraOff: params.isCameraOff,
      isSharingScreen: params.isSharingScreen,
    };
    if (peerUser.id === 'group') {
      socket.emit('call-state-change', payload);
    } else {
      socket.emit('call-state-change', { ...payload, targetUserId: peerUser.id });
    }
  };

  // Sync initial state once call status transitions to connected
  useEffect(() => {
    if (callStatus === 'connected' && socket) {
      const timer = setTimeout(() => {
        sendStateChange({ isMuted, isCameraOff, isSharingScreen });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [callStatus]);

  // 1-to-1 Call Handler Effect
  useEffect(() => {
    if ((!activeCall && !incomingCall) || !socket || !peerUser || peerUser.id === 'group') {
      return;
    }

    const drainIceCandidates = async () => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        while (iceCandidateQueueRef.current.length > 0) {
          const candidate = iceCandidateQueueRef.current.shift();
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('Error adding queued ICE candidate:', err);
            }
          }
        }
      }
    };

    const processOffer = async (pc: RTCPeerConnection, offer: RTCSessionDescriptionInit) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          targetUserId: peerUser.id,
          answer,
        });
      } catch (err) {
        console.error('Error processing WebRTC offer:', err);
      }
    };

    // Track remote stream accumulation to prevent track loss when multiple tracks arrive (audio then video)
    const remoteMediaStream = new MediaStream();

    const initConnection = async () => {
      if (peerConnectionRef.current) {
        // Already initialized (warmed up) during ringing.
        // If the user has now answered (activeCall is true), emit call-accept.
        if (!isCaller && activeCall) {
          socket.emit('call-accept', { callerId: peerUser.id, callId });
          // Process any pending offer that we received while ringing
          if (pendingOfferRef.current) {
            const pending = pendingOfferRef.current;
            pendingOfferRef.current = null;
            await processOffer(peerConnectionRef.current, pending);
          }
        }
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callType === 'video' ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
          } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              if (!remoteMediaStream.getTracks().includes(track)) {
                remoteMediaStream.addTrack(track);
              }
            });
          } else if (event.track) {
            if (!remoteMediaStream.getTracks().includes(event.track)) {
              remoteMediaStream.addTrack(event.track);
            }
          }

          remoteMediaStream.getAudioTracks().forEach((track) => {
            track.enabled = isSpeakerOn;
          });

          // Create a new MediaStream instance to force React state update & rerender
          const updatedStream = new MediaStream(remoteMediaStream.getTracks());
          setRemoteStream(updatedStream);
          dispatch(connectCall());
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
              targetUserId: peerUser.id,
              candidate: event.candidate,
            });
          }
        };

        if (!isCaller && activeCall) {
          socket.emit('call-accept', { callerId: peerUser.id, callId });
        }

        // Process any pending offer received before connection initialization finished
        if (pendingOfferRef.current && activeCall) {
          const pending = pendingOfferRef.current;
          pendingOfferRef.current = null;
          await processOffer(pc, pending);
        }
      } catch (err) {
        console.error('WebRTC Initialization Error:', err);
        dispatch(endCall());
      }
    };

    initConnection();

    socket.on('webrtc-offer', async ({ offer }) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && activeCall) {
          await processOffer(pc, offer);
        } else {
          pendingOfferRef.current = offer;
        }
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainIceCandidates();
        }
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidateQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('Error handling WebRTC ICE candidate:', err);
      }
    });

    socket.on('call-state-change', ({ senderId, isMuted, isCameraOff, isSharingScreen }) => {
      setPeerStates((prev) => ({
        ...prev,
        [senderId]: { isMuted, isCameraOff, isSharingScreen },
      }));
    });

    return () => {
      cleanupCall();
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('call-state-change');
    };
  }, [activeCall, incomingCall, socket, peerUser, callType, isCaller, dispatch]);

  // Group Call Handler Effect (Multi-Peer Mesh)
  useEffect(() => {
    if (!activeCall || !socket || !peerUser || peerUser.id !== 'group') {
      return;
    }

    socket.emit('group-call-join', { callId });

    const initLocalGroupMedia = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: callType === 'video' ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
          } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);
        dispatch(connectCall());
      } catch (err) {
        console.error('Error getting group local media:', err);
      }
    };
    initLocalGroupMedia();

    const createPeerConn = (peerId: string) => {
      if (peerConnectionsRef.current.has(peerId)) {
        return peerConnectionsRef.current.get(peerId)!;
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionsRef.current.set(peerId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const existingPeerIndex = prev.findIndex((p) => p.userId === peerId);
          let targetStream: MediaStream;

          if (existingPeerIndex !== -1) {
            targetStream = prev[existingPeerIndex].stream;
          } else {
            targetStream = new MediaStream();
          }

          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              if (!targetStream.getTracks().includes(track)) {
                targetStream.addTrack(track);
              }
            });
          } else if (event.track) {
            if (!targetStream.getTracks().includes(event.track)) {
              targetStream.addTrack(event.track);
            }
          }

          targetStream.getAudioTracks().forEach((track) => {
            track.enabled = isSpeakerOn;
          });

          const updatedStream = new MediaStream(targetStream.getTracks());

          if (existingPeerIndex !== -1) {
            const updated = [...prev];
            updated[existingPeerIndex] = { userId: peerId, stream: updatedStream };
            return updated;
          } else {
            return [...prev, { userId: peerId, stream: updatedStream }];
          }
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            targetUserId: peerId,
            candidate: event.candidate,
          });
        }
      };

      return pc;
    };

    socket.on('group-call-peer-joined', async ({ userId }) => {
      const pc = createPeerConn(userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', {
        targetUserId: userId,
        offer,
      });
    });

    socket.on('group-call-peer-left', ({ userId }) => {
      const pc = peerConnectionsRef.current.get(userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(userId);
      }
      setRemoteStreams((prev) => prev.filter((p) => p.userId !== userId));
      setPeerStates((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    });

    socket.on('webrtc-offer', async ({ senderId, offer }) => {
      try {
        const pc = createPeerConn(senderId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          targetUserId: senderId,
          answer,
        });
      } catch (err) {
        console.error('Error handling group offer:', err);
      }
    });

    socket.on('webrtc-answer', async ({ senderId, answer }) => {
      try {
        const pc = peerConnectionsRef.current.get(senderId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error handling group answer:', err);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ senderId, candidate }) => {
      try {
        const pc = peerConnectionsRef.current.get(senderId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error handling group ICE candidate:', err);
      }
    });

    socket.on('call-state-change', ({ senderId, isMuted, isCameraOff, isSharingScreen }) => {
      setPeerStates((prev) => ({
        ...prev,
        [senderId]: { isMuted, isCameraOff, isSharingScreen },
      }));
    });

    return () => {
      socket.emit('group-call-leave', { callId });
      socket.off('group-call-peer-joined');
      socket.off('group-call-peer-left');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('call-state-change');

      cleanupCall();
    };
  }, [activeCall, socket, peerUser, callType, callId, dispatch]);

  // Trigger WebRTC offer creation when callStatus changes to connected and local stream is ready
  useEffect(() => {
    if (callStatus === 'connected' && isCaller && localStream && peerConnectionRef.current) {
      const sendOffer = async () => {
        try {
          const pc = peerConnectionRef.current;
          if (pc) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('webrtc-offer', {
              targetUserId: peerUser?.id,
              offer,
            });
          }
        } catch (err) {
          console.error('Error initiating WebRTC offer:', err);
        }
      };
      sendOffer();
    }
  }, [callStatus, isCaller, socket, peerUser, localStream]);

  const toggleMute = (mute: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !mute;
      });
    }
    setIsMuted(mute);
    sendStateChange({ isMuted: mute, isCameraOff, isSharingScreen });
  };

  const toggleCamera = (disable: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !disable;
      });
    }
    setIsCameraOff(disable);
    sendStateChange({ isMuted, isCameraOff: disable, isSharingScreen });
  };

  const toggleSpeaker = (enabled: boolean) => {
    setIsSpeakerOn(enabled);
    if (remoteStream) {
      remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    remoteStreams.forEach((peer) => {
      if (peer.stream) {
        peer.stream.getAudioTracks().forEach((track: MediaStreamTrack) => {
          track.enabled = enabled;
        });
      }
    });
  };

  const flipCamera = async () => {
    if (videoDevices.length < 2 || !localStreamRef.current) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === currentVideoDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    setCurrentVideoDeviceId(nextDevice.deviceId);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: { deviceId: { exact: nextDevice.deviceId } },
      };
      const newVideoStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newVideoStream.getVideoTracks()[0];

      // Replace video track in 1-to-1 connection
      const pc = peerConnectionRef.current;
      if (pc) {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender && newVideoTrack) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Replace video track in all group peer connections
      peerConnectionsRef.current.forEach(async (groupPc) => {
        const videoSender = groupPc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender && newVideoTrack) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      });

      // Stop old video tracks
      localStreamRef.current.getVideoTracks().forEach((track) => track.stop());

      // Merge new video track into localStream
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      const combinedStream = new MediaStream(audioTrack ? [audioTrack, newVideoTrack] : [newVideoTrack]);

      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);
      
      // Update camera off state representation
      setIsCameraOff(false);
      sendStateChange({ isMuted, isCameraOff: false, isSharingScreen });
    } catch (err) {
      console.error('Error flipping camera:', err);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isSharingScreen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;

        const pc = peerConnectionRef.current;
        if (pc) {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
          const screenVideoTrack = screenStream.getVideoTracks()[0];
          if (videoSender && screenVideoTrack) {
            await videoSender.replaceTrack(screenVideoTrack);
          }
        }

        peerConnectionsRef.current.forEach(async (groupPc) => {
          const videoSender = groupPc.getSenders().find((s) => s.track?.kind === 'video');
          const screenVideoTrack = screenStream.getVideoTracks()[0];
          if (videoSender && screenVideoTrack) {
            await videoSender.replaceTrack(screenVideoTrack);
          }
        });

        setLocalStream(screenStream);
        setIsSharingScreen(true);
        sendStateChange({ isMuted, isCameraOff, isSharingScreen: true });

        const screenVideoTrack = screenStream.getVideoTracks()[0];
        if (screenVideoTrack) {
          screenVideoTrack.onended = () => {
            stopScreenShare();
          };
        }
      } else {
        await stopScreenShare();
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  const stopScreenShare = async () => {
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      const pc = peerConnectionRef.current;
      if (pc && localStreamRef.current) {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoSender && cameraVideoTrack) {
          await videoSender.replaceTrack(cameraVideoTrack);
        }
      }

      peerConnectionsRef.current.forEach(async (groupPc) => {
        if (localStreamRef.current) {
          const videoSender = groupPc.getSenders().find((s) => s.track?.kind === 'video');
          const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoSender && cameraVideoTrack) {
            await videoSender.replaceTrack(cameraVideoTrack);
          }
        }
      });

      setLocalStream(localStreamRef.current);
      setIsSharingScreen(false);
      sendStateChange({ isMuted, isCameraOff, isSharingScreen: false });
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  };

  return {
    localStream,
    remoteStream,
    remoteStreams,
    isSharingScreen,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    peerStates,
    hasMultipleCameras: videoDevices.length > 1,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    flipCamera,
    toggleScreenShare,
    hangup: () => {
      cleanupCall();
      if (socket && peerUser) {
        if (peerUser.id === 'group') {
          socket.emit('group-call-leave', { callId });
        } else {
          socket.emit('call-end', { targetUserId: peerUser.id, callId });
        }
      }
      dispatch(endCall());
    },
  };
};
