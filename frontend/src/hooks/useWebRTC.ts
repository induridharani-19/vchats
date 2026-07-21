import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Socket } from 'socket.io-client';
import { RootState } from '../redux/store';
import { connectCall, endCall } from '../redux/callSlice';

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
  const { activeCall, isCaller, peerUser, callType, callId, callStatus } = useSelector(
    (state: RootState) => state.call
  );

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<any[]>([]);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

  // Helper to cleanup streams/connections
  const cleanupCall = () => {
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
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams([]);
    iceCandidateQueueRef.current = [];
    pendingOfferRef.current = null;
  };

  // 1-to-1 Call Handler Effect
  useEffect(() => {
    if (!activeCall || !socket || !peerUser || peerUser.id === 'group') {
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

    const initConnection = async () => {
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
          const incomingStream = event.streams[0] || new MediaStream([event.track]);
          incomingStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
          setRemoteStream(incomingStream);
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

        if (!isCaller) {
          socket.emit('call-accept', { callerId: peerUser.id, callId });
        }

        // Process any pending offer received before connection initialization finished
        if (pendingOfferRef.current) {
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
        if (pc) {
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

    return () => {
      cleanupCall();
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    };
  }, [activeCall, socket, peerUser, callType, isCaller, dispatch]);

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
        const incomingStream = event.streams[0] || new MediaStream([event.track]);
        incomingStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        setRemoteStreams((prev) => {
          const exists = prev.some((p) => p.userId === peerId);
          if (exists) return prev;
          return [...prev, { userId: peerId, stream: incomingStream }];
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

    return () => {
      socket.emit('group-call-leave', { callId });
      socket.off('group-call-peer-joined');
      socket.off('group-call-peer-left');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');

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
  };

  const toggleCamera = (disable: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !disable;
      });
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

        setLocalStream(screenStream);
        setIsSharingScreen(true);

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

      setLocalStream(localStreamRef.current);
      setIsSharingScreen(false);
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  };

  return {
    localStream,
    remoteStream,
    remoteStreams,
    isSharingScreen,
    toggleMute,
    toggleCamera,
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
